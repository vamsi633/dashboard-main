import Link from "next/link";

export default async function FarmDetailPage({
  params,
}: {
  params: Promise<{ farmId: string }>;
}) {
  const { farmId } = await params;

  return (
    <div className="min-h-screen bg-[#050A12] text-white pt-[110px] px-6 sm:px-10 md:px-16 lg:px-24 xl:px-32 2xl:px-48">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Farm Details</h1>
          <p className="text-sm text-gray-400">Farm ID: {farmId}</p>
        </div>

        <Link href="/farms" className="text-sm underline text-blue-400">
          Back to Farms
        </Link>
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-900 p-5">
        <p className="text-gray-300">
          Next: we’ll fetch farm info + show devices in this farm here.
        </p>
      </div>
    </div>
  );
}
