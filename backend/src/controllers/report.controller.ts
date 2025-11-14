import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middlerware";
import { HTTPSTATUS } from "../config/http.config";
import {
  generateReportService,
  getAllReportsService,
  updateReportSettingService,
} from "../services/report.service";
import { updateReportSettingSchema } from "../validators/report.validator";

export const getAllReportsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;

    const pagination = {
      pageSize: parseInt(req.query.pageSize as string) || 20,
      pageNumber: parseInt(req.query.pageNumber as string) || 1,
    };

    const result = await getAllReportsService(userId, pagination);

    return res.status(HTTPSTATUS.OK).json({
      message: "Reports history fetched successfully",
      ...result,
    });
  }
);

export const updateReportSettingController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const body = updateReportSettingSchema.parse(req.body);

    await updateReportSettingService(userId, body);

    return res.status(HTTPSTATUS.OK).json({
      message: "Reports setting updated successfully",
    });
  }
);

export const generateReportController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { from, to } = req.query as { from?: string; to?: string };

    const parseDate = (value?: string) => {
      if (!value) return null;
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    };

    let toDate = parseDate(to) ?? new Date();
    let fromDate = parseDate(from);

    // Default range: last 30 days if from is missing/invalid
    if (!fromDate) {
      fromDate = new Date(toDate);
      fromDate.setDate(fromDate.getDate() - 30);
    }

    // Ensure fromDate is not after toDate
    if (fromDate > toDate) {
      const tmp = fromDate;
      fromDate = toDate;
      toDate = tmp;
    }

    const result = await generateReportService(userId, fromDate, toDate);

    return res.status(HTTPSTATUS.OK).json({
      message: "Report generated successfully",
      ...result,
    });
  }
);
