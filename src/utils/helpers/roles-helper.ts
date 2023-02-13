import { UnauthorizedException } from "@nestjs/common";
import { eRole } from "@prisma/client";

export function filterInferiorRole(role: eRole, target: eRole | null | undefined = null) {
    console.log("filterInferiorRole", role, target);
    if (target === null || target === eRole.USER) return true;
    else if (target === eRole.OWNER) {
        if (role !== eRole.OWNER) throw new UnauthorizedException(["You are not authorized to modify this channel"]);
    } else if (target === eRole.ADMIN) {
        if (role === eRole.USER) throw new UnauthorizedException(["You are not authorized to modify this channel"]);
    }
    return true;
}
export function throwIfRoleIsInferiorOrEqualToTarget(initiator_role: eRole = eRole.USER, target_role: eRole = eRole.OWNER) {
    console.log("throwIfRoleIsInferiorOrEqualToTarget", initiator_role, target_role);

    if (target_role === eRole.OWNER) {
        throw new UnauthorizedException(["Unauthorized action, you can't alter an OWNER"]);
    } else if (target_role === eRole.ADMIN && initiator_role !== eRole.OWNER) {
        throw new UnauthorizedException(["Unauthorized action, you can't alter an ADMIN"]);
    } else if (target_role === eRole.USER && initiator_role === eRole.USER) {
        throw new UnauthorizedException(["Unauthorized action, you can't alter a USER"]);
    }
}
