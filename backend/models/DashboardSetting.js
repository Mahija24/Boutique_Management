import mongoose from "mongoose";

const dashboardSettingSchema = new mongoose.Schema(
  {
    rentPending: { type: Number, default: 0 },
    billsPending: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const DashboardSetting = mongoose.model(
  "DashboardSetting",
  dashboardSettingSchema,
);

export default DashboardSetting;
