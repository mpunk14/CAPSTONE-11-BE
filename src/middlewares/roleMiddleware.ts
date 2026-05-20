import { Request, Response, NextFunction } from "express";

type AppRole = "sppg" | "school";

const normalizeRole = (role?: string): AppRole | undefined => {
  if (!role) return undefined;
  if (role === "sekolah") return "school";
  if (role === "school" || role === "sppg") return role;
  return undefined;
};

export const requireRole = (...allowedRoles: Array<AppRole | "sekolah">) => {
  const normalizedAllowedRoles = allowedRoles
    .map((role) => normalizeRole(role))
    .filter((role): role is AppRole => Boolean(role));

  return (req: Request, res: Response, next: NextFunction): any => {
    const currentRole = normalizeRole(req.user?.role);

    if (!currentRole) {
      return res.status(401).json({
        success: false,
        message: "Token tidak valid atau role tidak dikenali",
      });
    }

    if (!normalizedAllowedRoles.includes(currentRole)) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak untuk role ini",
      });
    }

    next();
  };
};