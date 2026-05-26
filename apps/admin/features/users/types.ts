export {
  type AuthLocationSummary,
  type AuthRoleSummary,
  type CreateUserPayload,
  type PermissionEntity,
  type RoleEntity,
  type UpdateUserPayload,
  type UserEntity,
  type UserListQuery,
} from "@/types/api";

export interface ResetPasswordPayload {
  password: string;
}
