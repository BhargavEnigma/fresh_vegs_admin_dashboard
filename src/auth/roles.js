export const AUTHORIZED_ADMIN_ROLES = ["admin", "warehouse_manager", "support_manager"];

export function normalizeRoles(roles) {
  if (!Array.isArray(roles)) return [];

  return roles
    .map((role) => {
      if (typeof role === "string") return role;
      if (typeof role?.name === "string") return role.name;
      if (typeof role?.role === "string") return role.role;
      if (typeof role?.role_name === "string") return role.role_name;
      if (typeof role?.slug === "string") return role.slug;
      return null;
    })
    .filter(Boolean);
}

export function getPayloadRoles(payload) {
  const data = payload?.data || payload || {};
  return normalizeRoles(
    data.roles ||
      data.user?.roles ||
      data.profile?.roles ||
      data.admin?.roles ||
      data.account?.roles
  );
}

export function hasAuthorizedAdminRole(roles) {
  return normalizeRoles(roles).some((role) => AUTHORIZED_ADMIN_ROLES.includes(role));
}

export function normalizeUserRoles(user) {
  if (!user) return user;
  return { ...user, roles: normalizeRoles(user.roles) };
}
