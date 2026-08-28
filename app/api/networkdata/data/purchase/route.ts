import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { verifyTransactionPin } from "@/lib/security/verifyTransactionPin";

import {
  getServiceFeePercent,
  calculateServiceFee,
} from "@/lib/service-fee";

const NETWORKDATASUB_BASE_URL =
  "https://networkdatasub.com/api";

const NETWORKDATASUB_PLANS_URL =
  `${NETWORKDATASUB_BASE_URL}/data/all-plans`;

const NETWORKDATASUB_PURCHASE_URL =
  `${NETWORKDATASUB_BASE_URL}/data/purchase`;

const REFERRAL_COMMISSION_SETTING_KEY =
  "REFERRAL_COMMISSION_DATA";

const DEFAULT_REFERRAL_COMMISSION_PERCENTAGE = 1;

// ============================================================
// NUMBER HELPER
// ============================================================

function extractNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const cleaned = value
      .replace(/₦/g, "")
      .replace(/,/g, "")
      .trim();

    const number = Number(cleaned);

    return Number.isFinite(number) ? number : 0;
  }

  return 0;
}

function extractString(
  value: unknown,
  fallback = ""
): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallback;
}

// ============================================================
// MATCH A PLAN FROM THE LIVE NETWORKDATASUB PLAN LIST
// ============================================================
//
// We never trust a price sent from the browser. Instead, we
// re-fetch NetworkDataSub's own current plan list and look up
// the requested bundle/plan ID in it, then use the price and
// details that NetworkDataSub itself reports right now.
//
function findMatchingPlan(
  rawPlans: any[],
  bundleId: number
) {
  return rawPlans.find((plan) => {
    const candidateIds = [
      plan.id,
      plan.bundle_id,
      plan.bundleId,
      plan.plan_id,
      plan.planId,
      plan.api_plan_id,
      plan.apiPlanId,
    ];

    return candidateIds.some(
      (candidate) =>
        candidate !== undefined &&
        candidate !== null &&
        Number(candidate) === bundleId
    );
  });
}

// ============================================================
// REFERRAL COMMISSION
// ============================================================

async function getReferralCommissionPercentage(): Promise<number> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: {
        key: REFERRAL_COMMISSION_SETTING_KEY,
      },
    });

    if (setting) {
      const value = Number(setting.value);

      if (
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 100
      ) {
        return value;
      }
    }
  } catch (error) {
    console.error(
      "NETWORKDATASUB REFERRAL COMMISSION SETTING ERROR:",
      error
    );
  }

  return DEFAULT_REFERRAL_COMMISSION_PERCENTAGE;
}

// ============================================================
// PHONE NORMALIZATION
// ============================================================

function normalizePhone(phone: unknown): string {
  let value = String(phone ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "");

  if (value.startsWith("+234")) {
    value = "0" + value.slice(4);
  } else if (value.startsWith("234")) {
    value = "0" + value.slice(3);
  }

  return value;
}

// ============================================================
// PROVIDER SUCCESS CHECK
// ============================================================
//
// NetworkDataSub's docs show: { "success": true, "message": "...",
// "data": { "status": "completed", ... } }
//
function isProviderSuccess(result: any): boolean {
  if (result?.success === true) {
    return true;
  }

  const status = String(
    result?.data?.status || ""
  ).toLowerCase();

  return (
    status === "completed" ||
    status === "success" ||
    status === "successful"
  );
}

// ============================================================
// POST
// ============================================================

export async function POST(request: NextRequest) {
  let transactionId: string | null = null;

  try {
    // ========================================================
    // 1. AUTHENTICATION
    // ========================================================

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    // ========================================================
    // 2. REQUEST BODY
    // ========================================================

    const body = await request.json();

    const rawBundleId =
      body.bundle_id ??
      body.bundleId ??
      body.plan_id ??
      body.planId ??
      body.data_plan_id ??
      body.dataPlanId;

    const rawPhoneNumber =
      body.phone_number ??
      body.phoneNumber ??
      body.phone;

    const bundleId = Number(rawBundleId);

    if (!Number.isInteger(bundleId) || bundleId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid data plan.",
          receivedBundleId: rawBundleId,
        },
        { status: 400 }
      );
    }

    // ========================================================
    // 3. PHONE NUMBER
    // ========================================================

    const cleanedPhone = normalizePhone(rawPhoneNumber);

    if (!/^0\d{10}$/.test(cleanedPhone)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid Nigerian phone number.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // 4. FIND USER + REFERRER
    // ========================================================

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      include: {
        referredBy: {
          select: {
            id: true,
            fullName: true,
            referralCode: true,
            referralBalance: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        { status: 404 }
      );
    }

    // ========================================================
    // 5. USER STATUS
    // ========================================================

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "Your account is not active.",
        },
        { status: 403 }
      );
    }

    // ========================================================
    // 6. TRANSACTION PIN
    // ========================================================

    const transactionPin =
      body.transactionPin ?? body.transaction_pin;

    if (!transactionPin) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaction PIN is required.",
        },
        { status: 400 }
      );
    }

    const pinResult = await verifyTransactionPin(
      user.id,
      String(transactionPin)
    );

    if (!pinResult.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            pinResult.message ||
            "Invalid transaction PIN.",
        },
        { status: 403 }
      );
    }

    // ========================================================
    // 7. API KEY
    // ========================================================

    const apiKey = process.env.NETWORKDATASUB_API_KEY;

    if (!apiKey) {
      console.error(
        "NETWORKDATASUB_API_KEY is missing."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "NetworkDataSub API key is not configured.",
        },
        { status: 500 }
      );
    }

    // ========================================================
    // 8. FETCH LIVE PLAN LIST AND MATCH THE REQUESTED PLAN
    // ========================================================
    //
    // We re-fetch the current plan list rather than trusting
    // any price the browser sends — this is the same live
    // source of truth the listing page itself uses.
    //
    let plansResponse: Response;

    try {
      plansResponse = await fetch(
        NETWORKDATASUB_PLANS_URL,
        {
          method: "GET",
          headers: {
            Authorization: `Token ${apiKey}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(30000),
        }
      );
    } catch (fetchError: any) {
      console.error(
        "NETWORKDATASUB PLANS FETCH ERROR (during purchase):",
        fetchError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to reach NetworkDataSub to confirm plan pricing.",
        },
        { status: 502 }
      );
    }

    const plansText = await plansResponse.text();

    let plansResult: any = null;

    try {
      plansResult = plansText.trim()
        ? JSON.parse(plansText)
        : null;
    } catch (error) {
      console.error(
        "NETWORKDATASUB PLANS JSON PARSE ERROR (during purchase):",
        error
      );
    }

    const rawPlans: any[] = Array.isArray(
      plansResult?.data
    )
      ? plansResult.data
      : Array.isArray(plansResult?.data?.plans)
      ? plansResult.data.plans
      : Array.isArray(plansResult?.plans)
      ? plansResult.plans
      : [];

    const matchedPlan = findMatchingPlan(
      rawPlans,
      bundleId
    );

    if (!matchedPlan) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This data plan is no longer available. Please refresh and try again.",
          bundleId,
        },
        { status: 400 }
      );
    }

    const provider = extractString(
      matchedPlan.provider ??
        matchedPlan.network ??
        matchedPlan.network_name ??
        matchedPlan.networkName,
      "NETWORKDATASUB"
    ).toUpperCase();

    const planName = extractString(
      matchedPlan.name ??
        matchedPlan.plan_name ??
        matchedPlan.planName ??
        matchedPlan.title ??
        matchedPlan.description,
      "Data Plan"
    );

    const size = extractString(
      matchedPlan.size ??
        matchedPlan.data ??
        matchedPlan.data_size ??
        matchedPlan.dataSize
    );

    const duration = extractString(
      matchedPlan.duration ??
        matchedPlan.validity ??
        matchedPlan.validity_period ??
        matchedPlan.validityPeriod
    );

    const basePrice = extractNumber(
      matchedPlan.price ??
        matchedPlan.selling_price ??
        matchedPlan.sellingPrice ??
        matchedPlan.amount ??
        matchedPlan.api_price ??
        matchedPlan.apiPrice ??
        matchedPlan.cost
    );

    const providerCost = extractNumber(
      matchedPlan.provider_price ??
        matchedPlan.providerPrice ??
        matchedPlan.cost ??
        matchedPlan.api_price ??
        matchedPlan.apiPrice ??
        basePrice
    );

    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid plan price.",
          bundleId,
          basePrice,
        },
        { status: 500 }
      );
    }

    // ========================================================
    // 9. SERVICE FEE
    // ========================================================

    const serviceFeePercentage =
      await getServiceFeePercent();

    const pricing = calculateServiceFee(
      basePrice,
      serviceFeePercentage
    );

    const serviceFee = Number(
      pricing.serviceFee.toFixed(2)
    );

    const amount = Number(
      pricing.totalAmount.toFixed(2)
    );

    // ========================================================
    // 10. REFERRAL COMMISSION
    // ========================================================

    const referralPercentage =
      await getReferralCommissionPercentage();

    // ========================================================
    // 11. PROFIT
    // ========================================================

    const grossProfit = Number(
      (amount - providerCost).toFixed(2)
    );

    let referralCommission = 0;

    if (
      user.referredBy &&
      grossProfit > 0 &&
      referralPercentage > 0
    ) {
      const calculatedCommission = Number(
        (
          basePrice *
          (referralPercentage / 100)
        ).toFixed(2)
      );

      referralCommission = Math.min(
        calculatedCommission,
        grossProfit
      );
    }

    const profit = Number(
      (grossProfit - referralCommission).toFixed(2)
    );

    // ========================================================
    // 12. CHECK USER WALLET
    // ========================================================

    const walletBalance = Number(
      user.walletBalance
    );

    if (
      !Number.isFinite(walletBalance) ||
      walletBalance < amount
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Insufficient wallet balance.",
          balance: walletBalance,
          required: amount,
          basePrice,
          serviceFeePercentage,
          serviceFee,
          totalAmount: amount,
        },
        { status: 400 }
      );
    }

    // ========================================================
    // 13. CREATE REFERENCE
    // ========================================================

    const reference = `NDS-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    // ========================================================
    // 14. CREATE PENDING TRANSACTION
    // ========================================================

    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        type: "DATA",
        amount,
        reference,
        status: "PENDING",
        provider: "NetworkDataSub",
        cost: providerCost,
        profit,
        description: `${provider} ${size} ${duration} for ${cleanedPhone}`,
      },
    });

    transactionId = transaction.id;

    // ========================================================
    // 15. NETWORKDATASUB PURCHASE REQUEST
    // ========================================================
    //
    // Per NetworkDataSub's docs, the param is "data_plan_id"
    // (accepts either their api_plan_id or plan_id) —
    // NOT "bundle_id", which is CheapDataHub's naming.
    //
    const providerBody = {
      data_plan_id: bundleId,
      phone_number: cleanedPhone,
    };

    console.log(
      "======================================"
    );
    console.log("NETWORKDATASUB DATA PURCHASE REQUEST");
    console.log({
      url: NETWORKDATASUB_PURCHASE_URL,
      data_plan_id: bundleId,
      phone_number: cleanedPhone,
      provider,
      size,
      duration,
      basePrice,
      serviceFeePercentage,
      serviceFee,
      customerAmount: amount,
      providerCost,
      grossProfit,
      referralPercentage,
      referralCommission,
      businessProfit: profit,
    });
    console.log(
      "======================================"
    );

    let providerResponse: Response;

    try {
      providerResponse = await fetch(
        NETWORKDATASUB_PURCHASE_URL,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(providerBody),
          cache: "no-store",
          signal: AbortSignal.timeout(30000),
        }
      );
    } catch (fetchError: any) {
      console.error(
        "NETWORKDATASUB PURCHASE FETCH ERROR:",
        fetchError
      );

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "FAILED", cost: 0, profit: 0 },
      });

      return NextResponse.json(
        {
          success: false,
          message: "Unable to connect to NetworkDataSub.",
          error:
            fetchError?.message ||
            "Provider connection failed.",
          request: providerBody,
        },
        { status: 502 }
      );
    }

    // ========================================================
    // 16. READ PROVIDER RESPONSE
    // ========================================================

    const responseText = await providerResponse.text();

    console.log(
      "NETWORKDATASUB PURCHASE STATUS:",
      providerResponse.status
    );
    console.log(
      "NETWORKDATASUB PURCHASE RESPONSE:",
      responseText
    );
    console.log(
      "======================================"
    );

    let providerResult: any = null;

    try {
      providerResult = responseText.trim()
        ? JSON.parse(responseText)
        : null;
    } catch (parseError) {
      console.error(
        "NETWORKDATASUB PURCHASE JSON PARSE ERROR:",
        parseError
      );
    }

    // ========================================================
    // 17. INVALID RESPONSE
    // ========================================================

    if (!providerResult) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "FAILED", cost: 0, profit: 0 },
      });

      return NextResponse.json(
        {
          success: false,
          message:
            "NetworkDataSub returned an invalid response.",
          providerStatus: providerResponse.status,
          providerResponse: responseText,
          request: providerBody,
        },
        { status: 502 }
      );
    }

    // ========================================================
    // 18. PROVIDER FAILURE
    // ========================================================

    const providerSuccess = isProviderSuccess(
      providerResult
    );

    if (!providerResponse.ok || !providerSuccess) {
      console.error(
        "======================================"
      );
      console.error(
        "NETWORKDATASUB DATA PURCHASE FAILED"
      );
      console.error({
        httpStatus: providerResponse.status,
        providerResponse: providerResult,
        request: providerBody,
        bundleId,
        phone: cleanedPhone,
      });
      console.error(
        "======================================"
      );

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "FAILED", cost: 0, profit: 0 },
      });

      return NextResponse.json(
        {
          success: false,
          message:
            providerResult.message ||
            providerResult.error ||
            "Data purchase failed.",
          providerStatus: providerResponse.status,
          providerResponse: providerResult,
          request: providerBody,
          bundleId,
          phoneNumber: cleanedPhone,
        },
        {
          status:
            providerResponse.status >= 400 &&
            providerResponse.status <= 599
              ? providerResponse.status
              : 400,
        }
      );
    }

    // ========================================================
    // 19. PROVIDER SUCCESS
    // ========================================================

    const providerReference =
      providerResult?.data?.reference ??
      providerResult?.data?.transaction_id ??
      providerResult?.reference ??
      null;

    console.log("NETWORKDATASUB DATA SUCCESS:", {
      providerReference,
      providerResult,
    });

    // ========================================================
    // 20. COMPLETE EVERYTHING ATOMICALLY
    // ========================================================

    const result = await prisma.$transaction(
      async (tx) => {
        const currentUser = await tx.user.findUnique({
          where: { id: user.id },
        });

        if (!currentUser) {
          throw new Error("User not found.");
        }

        const currentBalance = Number(
          currentUser.walletBalance
        );

        if (
          !Number.isFinite(currentBalance) ||
          currentBalance < amount
        ) {
          throw new Error(
            "Insufficient wallet balance."
          );
        }

        let businessWallet =
          await tx.businessWallet.findUnique({
            where: { name: "Brainfriend Global Tech" },
          });

        if (!businessWallet) {
          businessWallet =
            await tx.businessWallet.create({
              data: {
                name: "Brainfriend Global Tech",
                balance: 0,
                totalRevenue: 0,
                totalCost: 0,
                totalProfit: 0,
                withdrawnProfit: 0,
                availableProfit: 0,
              },
            });
        }

        const newUserBalance = Number(
          (currentBalance - amount).toFixed(2)
        );

        const newBusinessBalance = Number(
          (
            Number(businessWallet.balance) + profit
          ).toFixed(2)
        );

        const newTotalRevenue = Number(
          (
            Number(businessWallet.totalRevenue) +
            amount
          ).toFixed(2)
        );

        const newTotalCost = Number(
          (
            Number(businessWallet.totalCost) +
            providerCost
          ).toFixed(2)
        );

        const newTotalProfit = Number(
          (
            Number(businessWallet.totalProfit) +
            profit
          ).toFixed(2)
        );

        const newAvailableProfit = Number(
          (
            Number(businessWallet.availableProfit) +
            profit
          ).toFixed(2)
        );

        await tx.user.update({
          where: { id: user.id },
          data: { walletBalance: newUserBalance },
        });

        await tx.businessWallet.update({
          where: { id: businessWallet.id },
          data: {
            balance: newBusinessBalance,
            totalRevenue: newTotalRevenue,
            totalCost: newTotalCost,
            totalProfit: newTotalProfit,
            availableProfit: newAvailableProfit,
          },
        });

        await tx.businessRevenue.create({
          data: {
            transactionId: transaction.id,
            type: "DATA",
            provider: "NetworkDataSub",
            amount,
            cost: providerCost,
            profit,
            reference,
            description: `${provider} ${size} ${duration} for ${cleanedPhone} + ${serviceFeePercentage}% service fee`,
            businessWalletId: businessWallet.id,
          },
        });

        if (user.referredBy && referralCommission > 0) {
          await tx.user.update({
            where: { id: user.referredBy.id },
            data: {
              referralBalance: {
                increment: referralCommission,
              },
            },
          });

          await tx.referralEarning.create({
            data: {
              referrerId: user.referredBy.id,
              referredUserId: user.id,
              transactionId: transaction.id,
              amount: referralCommission,
              percentage: referralPercentage,
              transactionAmount: basePrice,
              type: "DATA",
              status: "SUCCESS",
              description: `Referral earning from ${user.fullName}'s ${provider} ${size} data purchase of ₦${basePrice}`,
              reference: `REF-${reference}`,
            },
          });
        }

        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "SUCCESS",
            cost: providerCost,
            profit,
            description: `${provider} ${size} ${duration} for ${cleanedPhone} + ${serviceFeePercentage}% service fee`,
          },
        });

        const updatedUser = await tx.user.findUnique({
          where: { id: user.id },
          select: {
            walletBalance: true,
            referralBalance: true,
          },
        });

        return {
          walletBalance: Number(
            updatedUser?.walletBalance ?? 0
          ),
          referralBalance: Number(
            updatedUser?.referralBalance ?? 0
          ),
          businessBalance: newBusinessBalance,
          grossProfit,
          referralCommission,
          profit,
        };
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );

    // ========================================================
    // 21. SUCCESS RESPONSE
    // ========================================================

    return NextResponse.json({
      success: true,
      message:
        providerResult?.message ||
        "Data purchase successful.",
      reference,
      providerReference,
      bundle_id: bundleId,
      phone_number: cleanedPhone,
      provider,
      size,
      duration,
      basePrice,
      serviceFeePercentage,
      serviceFee,
      amount,
      providerCost,
      grossProfit: result.grossProfit,
      referralPercentage,
      referralCommission: result.referralCommission,
      profit: result.profit,
      walletBalance: result.walletBalance,
      referralBalance: result.referralBalance,
      providerResponse: providerResult,
    });
  } catch (error: any) {
    console.error(
      "======================================"
    );
    console.error("NETWORKDATASUB DATA PURCHASE ERROR:");
    console.error(error?.message || error);
    console.error(error?.stack || "");
    console.error(
      "======================================"
    );

    if (transactionId) {
      try {
        const transaction =
          await prisma.transaction.findUnique({
            where: { id: transactionId },
          });

        if (
          transaction &&
          transaction.status === "PENDING"
        ) {
          await prisma.transaction.update({
            where: { id: transactionId },
            data: { status: "FAILED", cost: 0, profit: 0 },
          });
        }
      } catch (updateError) {
        console.error(
          "FAILED TO UPDATE NETWORKDATASUB TRANSACTION:",
          updateError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Data purchase failed.",
      },
      { status: 500 }
    );
  }
}