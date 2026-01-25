import { Router } from "express";
import { DonationController } from "./controller";
import { DonationRepository } from "./repository";

export const donationRouter = Router();
const donationController = new DonationController(new DonationRepository());

donationRouter.post(
  "/donate/paystack",
  donationController.handlePaystackWebhook,
);
