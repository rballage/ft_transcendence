import { UnauthorizedException } from "@nestjs/common";
import { Role } from "@prisma/client";

export function filterInferiorRole(role: Role, target: Role | null | undefined = null) {
    console.log("filterInferiorRole", role, target);
    if (target === null || target === Role.USER) return true;
    else if (target === Role.OWNER) {
        if (role !== Role.OWNER) throw new UnauthorizedException(["You are not authorized to modify this channel"]);
    } else if (target === Role.ADMIN) {
        if (role === Role.USER) throw new UnauthorizedException(["You are not authorized to modify this channel"]);
    }
    return true;
}
export function throwIfRoleIsInferiorOrEqualToTarget(initiator_role: Role = Role.USER, target_role: Role = Role.OWNER) {
    console.log("throwIfRoleIsInferiorOrEqualToTarget", initiator_role, target_role);

    if (target_role === Role.OWNER) {
        throw new UnauthorizedException(["Unauthorized action, you can't alter an OWNER"]);
    } else if (target_role === Role.ADMIN && initiator_role !== Role.OWNER) {
        throw new UnauthorizedException(["Unauthorized action, you can't alter an ADMIN"]);
    } else if (target_role === Role.USER && initiator_role === Role.USER) {
        throw new UnauthorizedException(["Unauthorized action, you can't alter a USER"]);
    }
}
