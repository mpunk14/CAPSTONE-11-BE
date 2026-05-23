import { ErrorRequestHandler } from "express";
import multer from "multer";
import { CsvValidationError } from "../services/csvParserService";

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, next): any => {
  if (!error) {
    next();
    return;
  }

  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error instanceof CsvValidationError) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error instanceof Error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};
