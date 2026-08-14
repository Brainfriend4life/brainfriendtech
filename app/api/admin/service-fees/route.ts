
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getServerSession,
} from "next-auth";

import {
  authOptions,
} from "@/lib/auth";

import {
  prisma,
} from "@/lib/prisma";

const SERVICE_FEE_SETTING_KEY =
  "SERVICE_FEE_PERCENT";

const DEFAULT_SERVICE_FEE_PERCENT = 5;

// ============================================================
// GET SERVICE FEE
// ============================================================

export async function GET() {
  try {
    const session =
      await getServerSession(
        authOptions
      );

    if (
      !session?.user?.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must be logged in.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      session.user.role !==
      "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unauthorized.",
        },
        {
          status: 403,
        }
      );
    }

    const setting =
      await prisma.systemSetting.findUnique(
        {
          where: {
            key:
              SERVICE_FEE_SETTING_KEY,
          },
        }
      );

    let percentage =
      DEFAULT_SERVICE_FEE_PERCENT;

    if (setting) {
      const parsed =
        Number(
          setting.value
        );

      if (
        Number.isFinite(
          parsed
        ) &&
        parsed >= 0 &&
        parsed <= 100
      ) {
        percentage =
          parsed;
      }
    }

    return NextResponse.json(
      {
        success: true,

        percentage,

        message:
          "Service fee retrieved successfully.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "SERVICE FEE GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to load service fee.",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// UPDATE SERVICE FEE
// ============================================================

export async function POST(
  request: NextRequest
) {
  try {
    const session =
      await getServerSession(
        authOptions
      );

    if (
      !session?.user?.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must be logged in.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      session.user.role !==
      "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unauthorized.",
        },
        {
          status: 403,
        }
      );
    }

    let body: {
      percentage?: unknown;
    };

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid JSON request body.",
        },
        {
          status: 400,
        }
      );
    }

    const percentage =
      Number(
        body?.percentage
      );

    if (
      !Number.isFinite(
        percentage
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid service fee percentage.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      percentage < 0 ||
      percentage > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Service fee must be between 0% and 100%.",
        },
        {
          status: 400,
        }
      );
    }

    const roundedPercentage =
      Number(
        percentage.toFixed(
          2
        )
      );

    const setting =
      await prisma.systemSetting.upsert(
        {
          where: {
            key:
              SERVICE_FEE_SETTING_KEY,
          },

          update: {
            value:
              String(
                roundedPercentage
              ),

            description:
              "Global service fee percentage charged on digital services.",
          },

          create: {
            key:
              SERVICE_FEE_SETTING_KEY,

            value:
              String(
                roundedPercentage
              ),

            description:
              "Global service fee percentage charged on digital services.",
          },
        }
      );

    return NextResponse.json(
      {
        success: true,

        message:
          "Service fee updated successfully.",

        percentage:
          Number(
            setting.value
          ),
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "SERVICE FEE UPDATE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to update service fee.",
      },
      {
        status: 500,
      }
    );
  }
}

