/**
 * Core module – exports partagés (guards, decorators) pour une architecture modulaire.
 * Les modules métier importent depuis ici pour une séparation claire des responsabilités.
 */

export { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
export { RolesGuard } from '../auth/guards/roles.guard';
export { Roles } from '../auth/decorators/roles.decorator';
