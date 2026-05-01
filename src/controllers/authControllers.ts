import { Request, Response } from "express";
import { loginService } from "../services/auth.service";

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    // Validasi input dasar
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email dan Password wajib diisi!" });
    }

    const result = await loginService(email, password);
    return res.status(result.status).json(result.data);
    
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Contoh Controller untuk Protected Route
export const dashboard = async (req: Request, res: Response): Promise<any> => {
  // req.user di-inject dari middleware verifyToken
  return res.status(200).json({
    success: true,
    message: "Selamat datang di dashboard rahasia!",
    user: req.user, 
  });
};