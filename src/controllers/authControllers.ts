import { Request, Response } from "express";
import { loginService } from "../services/auth.service";

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, identifier, password, role } = req.body;
    const credential = identifier || email;

    if (!credential || !password) {
      return res.status(400).json({
        success: false,
        message: "Identifier/email dan password wajib diisi",
      });
    }

    const result = await loginService(credential, password, role);
    return res.status(result.status).json(result.data);
    
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Contoh Controller untuk Protected Route
export const dashboard = async (req: Request, res: Response): Promise<any> => {
  const authRequest = req as Request & { user?: unknown };

  return res.status(200).json({
    success: true,
    message: "Selamat datang di dashboard rahasia!",
    user: authRequest.user,
  });
};
