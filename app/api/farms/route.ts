// app/api/farms/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createFarm, listFarmsForUser } from "@/lib/farms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const farms = await listFarmsForUser(session.user.id);

  return NextResponse.json(
    {
      ok: true,
      farms: farms.map((f) => ({
        id: f._id.toHexString(),
        name: f.name,
        description: f.description,
        location: f.location,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    },
    { status: 200 }
  );
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = (await req.json()) as {
      name?: string;
      description?: string;
      location?: string;
    };

    const name = (body.name ?? "").trim();
    if (!name || name.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Farm name must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Optional: add length limits
    if (name.length > 100) {
      return NextResponse.json(
        { ok: false, error: "Farm name must be under 100 characters" },
        { status: 400 }
      );
    }

    const farm = await createFarm({
      ownerId: session.user.id,
      name,
      description: body.description,
      location: body.location,
    });

    return NextResponse.json(
      {
        ok: true,
        farm: {
          id: farm._id.toHexString(),
          name: farm.name,
          description: farm.description,
          location: farm.location,
          createdAt: farm.createdAt,
          updatedAt: farm.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Create farm error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to create farm" },
      { status: 500 }
    );
  }
}
