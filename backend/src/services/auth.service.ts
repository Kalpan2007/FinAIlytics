import mongoose from "mongoose";
import UserModel from "../models/user.model";
import { NotFoundException, UnauthorizedException } from "../utils/app-error";
import {
  LoginSchemaType,
  RegisterSchemaType,
} from "../validators/auth.validator";
import ReportSettingModel, {
  ReportFrequencyEnum,
} from "../models/report-setting.model";
import { calulateNextReportDate } from "../utils/helper";
import { signJwtToken } from "../utils/jwt";

export const registerService = async (body: RegisterSchemaType) => {
  const { email } = body;

  let session: mongoose.ClientSession | null = null;

  try {
    session = await mongoose.startSession();
    let result: any = null;
    await session.withTransaction(async () => {
      const existingUser = await UserModel.findOne({ email }).session(session);
      if (existingUser) throw new UnauthorizedException("User already exists");

      const newUser = new UserModel({
        ...body,
      });

      await newUser.save({ session });

      const reportSetting = new ReportSettingModel({
        userId: newUser._id,
        frequency: ReportFrequencyEnum.MONTHLY,
        isEnabled: true,
        nextReportDate: calulateNextReportDate(),
        lastSentDate: null,
      });
      await reportSetting.save({ session });

      result = { user: newUser.omitPassword() };
    });
    return result;
  } catch (error: any) {
    // Fallback for standalone MongoDB (no replica set): perform non-transactional writes
    const message = String(error?.message || error);
    if (
      message.includes("Transaction numbers are only allowed on a replica set member") ||
      message.includes("Transaction numbers are only allowed on a replica set member or mongos")
    ) {
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) throw new UnauthorizedException("User already exists");

      const newUser = new UserModel({
        ...body,
      });
      await newUser.save();

      const reportSetting = new ReportSettingModel({
        userId: newUser._id,
        frequency: ReportFrequencyEnum.MONTHLY,
        isEnabled: true,
        nextReportDate: calulateNextReportDate(),
        lastSentDate: null,
      });
      await reportSetting.save();

      return { user: newUser.omitPassword() };
    }

    throw error;
  } finally {
    if (session) await session.endSession();
  }
};

export const loginService = async (body: LoginSchemaType) => {
  const email = body.email.trim().toLowerCase();
  const { password } = body;
  const user = await UserModel.findOne({ email });
  if (!user) throw new NotFoundException("Email/password not found");

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid)
    throw new UnauthorizedException("Invalid email/password");

  const { token, expiresAt } = signJwtToken({ userId: user.id });

  const reportSetting = await ReportSettingModel.findOne(
    {
      userId: user.id,
    },
    { _id: 1, frequency: 1, isEnabled: 1 }
  ).lean();

  return {
    user: user.omitPassword(),
    accessToken: token,
    expiresAt,
    reportSetting,
  };
};
