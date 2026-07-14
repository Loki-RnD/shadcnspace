import "server-only";

import { sql } from "./db";

// Access semantics (confirmed 2026-07-14):
//  * business access is always explicit rows
//  * dept_access_all / sub_dept_access_all = everything in accessible
//    businesses, including org units added later
//  * department grant with NO sub-department rows in that department
//    = full visibility of the department
//  * any sub-department rows narrow visibility to ONLY those sub-departments

export interface AdminUserRow {
  id: string;
  user_code: string;
  full_name: string;
  email: string;
  system_role: string;
  company_role: string;
  dept_access_all: boolean;
  sub_dept_access_all: boolean;
  active: boolean;
  companies: string[];
  departments: string[];
  sub_departments: string[];
}

export async function listUsers(): Promise<AdminUserRow[]> {
  const rows = await sql`
    select
      u.id, u.user_code, u.full_name, u.email, u.system_role, u.company_role,
      u.dept_access_all, u.sub_dept_access_all, u.active,
      coalesce((
        select array_agg(b.short_name order by b.short_name)
        from core.user_business_access ba
        join core.businesses b on b.id = ba.business_id
        where ba.user_id = u.id), '{}') as companies,
      coalesce((
        select array_agg(distinct b.short_name || ' · ' || d.name)
        from core.user_department_access da
        join core.departments d on d.id = da.department_id
        join core.businesses b on b.id = d.business_id
        where da.user_id = u.id), '{}') as departments,
      coalesce((
        select array_agg(distinct s.name)
        from core.user_sub_department_access sa
        join core.sub_departments s on s.id = sa.sub_department_id
        where sa.user_id = u.id), '{}') as sub_departments
    from core.users u
    order by u.user_code
  `;
  return rows as AdminUserRow[];
}

export interface OrgBusiness {
  id: string;
  short_name: string;
  name: string;
  departments: {
    id: string;
    name: string;
    sub_departments: { id: string; name: string }[];
  }[];
}

export async function listOrg(): Promise<OrgBusiness[]> {
  const rows = await sql`
    select b.id, b.short_name, b.name,
      coalesce(json_agg(json_build_object(
        'id', d.id, 'name', d.name,
        'sub_departments', coalesce((
          select json_agg(json_build_object('id', s.id, 'name', s.name) order by s.name)
          from core.sub_departments s where s.department_id = d.id), '[]'::json)
      ) order by d.name) filter (where d.id is not null), '[]'::json) as departments
    from core.businesses b
    left join core.departments d on d.business_id = b.id
    group by b.id
    order by b.code
  `;
  return rows as OrgBusiness[];
}
