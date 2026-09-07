export const USER_ROLES = Object.freeze({
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  OFFICER: "OFFICER",
});

export const MANAGEMENT_ROLES = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.MANAGER,
]);
