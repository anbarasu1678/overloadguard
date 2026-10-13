import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthUser, UserRole } from '../types';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Middleware to authenticate requests using a Supabase JWT.
 * Verifies token via Supabase Auth API and loads user role from profiles.
 */
export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authorization token missing or malformed',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired authentication token',
      });
      return;
    }

    // Retrieve profile to obtain user role and metadata
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, full_name, organization')
      .eq('id', user.id)
      .single();

    const role: UserRole = (profile?.role as UserRole) || 'fleet_owner';

    req.user = {
      id: user.id,
      email: user.email,
      role,
      full_name: profile?.full_name || user.user_metadata?.full_name || 'User',
    };

    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      details: err.message,
    });
  }
}

/**
 * Middleware to enforce role-based access control.
 * @param allowedRoles Array of UserRoles that are authorized to access the route
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: User authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Forbidden: Role '${req.user.role}' does not have permission for this resource. Required: [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
}
