/**
 * Core module - shared exports (guards, decorators) for modular architecture.
 * Business modules import from here for clear separation of responsibilities.
 */

export { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
export { RolesGuard } from '../auth/guards/roles.guard';
export { Roles } from '../auth/decorators/roles.decorator';
