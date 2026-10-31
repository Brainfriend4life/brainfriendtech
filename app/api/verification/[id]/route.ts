import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { av } from "@/lib/ageverify";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // ============================================================
    // AUTHENTICATION
    // ============================================================

    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }

    const { id } = await params;

    // ============================================================
    // FIND VERIFICATION
    // ============================================================

    let verification = await prisma.identityVerification.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!verification) {
      return NextResponse.json(
        {
          error: "Verification not found.",
        },
        { status: 404 },
      );
    }

    // ============================================================
    // CHECK AGEVERIFY WHILE PROCESSING
    // ============================================================

    if (verification.status === "PROCESSING" && verification.upstreamRef) {
      let response;

      try {
        response = await av(`/verifications/${verification.upstreamRef}`);
      } catch (error) {
        console.error("AGEVERIFY STATUS REQUEST ERROR:", error);

        // Do not mark the verification failed just because
        // the status check temporarily failed.
        return NextResponse.json({
          id: verification.id,
          service: verification.service,
          reference: verification.reference,
          amount: verification.amount,
          status: verification.status,
          result: verification.result,
          refunded: verification.refunded,
          createdAt: verification.createdAt,
          updatedAt: verification.updatedAt,
        });
      }

      const data = response.body?.data;

      const upstreamStatus = String(data?.status ?? "").toLowerCase();

      console.log("AGEVERIFY STATUS CHECK:", {
        verificationId: verification.id,
        upstreamRef: verification.upstreamRef,
        upstreamStatus,
        responseStatus: response.status,
        responseOk: response.ok,
      });

      // ==========================================================
      // COMPLETED
      // ==========================================================

      if (response.ok && upstreamStatus === "completed") {
        verification = await prisma.identityVerification.update({
          where: {
            id: verification.id,
          },
          data: {
            status: "COMPLETED",
            result: data?.data ?? data,
          },
        });
      }

      // ==========================================================
      // FAILED / REJECTED
      // ==========================================================
      else if (response.ok && ["failed", "rejected"].includes(upstreamStatus)) {
        verification = await prisma.identityVerification.update({
          where: {
            id,
          },
          data: {
            status: "FAILED",
          },
        });

        // ========================================================
        // REFUND ONLY ONCE
        // ========================================================

        if (!verification.refunded) {
          await prisma.$transaction(async (tx) => {
            const current = await tx.identityVerification.findUnique({
              where: {
                id,
              },
            });

            // Another request may already have refunded it.
            if (!current || current.refunded) {
              return;
            }

            // Refund wallet.
            await tx.user.update({
              where: {
                id: current.userId,
              },
              data: {
                walletBalance: {
                  increment: current.amount,
                },
              },
            });

            // Create refund transaction.
            await tx.transaction.create({
              data: {
                userId: current.userId,
                type: "NIN",
                amount: current.amount,
                description: `Refund for failed identity verification (${current.reference})`,
                status: "SUCCESS",
                reference: `REFUND-${current.reference}`,
                provider: "AGEVERIFY",
                cost: 0,
                profit: 0,
              },
            });

            // Prevent another refund.
            await tx.identityVerification.update({
              where: {
                id: current.id,
              },
              data: {
                refunded: true,
              },
            });
          });

          // Reload after refund.
          verification = await prisma.identityVerification.findUniqueOrThrow({
            where: {
              id: verification.id,
            },
          });
        }
      }
    }

    // ============================================================
    // RESPONSE
    // ============================================================

    return NextResponse.json({
      id: verification.id,
      service: verification.service,
      reference: verification.reference,
      amount: verification.amount,
      status: verification.status,
      result: verification.result,
      refunded: verification.refunded,
      createdAt: verification.createdAt,
      updatedAt: verification.updatedAt,
    });
  } catch (error: any) {
    console.error("IDENTITY VERIFICATION STATUS ERROR:", error);

    return NextResponse.json(
      {
        error: error?.message || "Unable to check verification status.",
      },
      { status: 500 },
    );
  }
}
