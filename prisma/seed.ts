import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedEntry = {
  usernameDisplay: string;
  lots: number;
  avgPrice: number;
  totalNominal: number;
};

const seedEntries: SeedEntry[] = [
  { usernameDisplay: "BigWhale", lots: 920000, avgPrice: 9850, totalNominal: 906200000000 },
  { usernameDisplay: "SultanSaham", lots: 810000, avgPrice: 9750, totalNominal: 789750000000 },
  { usernameDisplay: "ValueHunter", lots: 760000, avgPrice: 9920, totalNominal: 753920000000 },
  { usernameDisplay: "BandarSantai", lots: 690000, avgPrice: 10020, totalNominal: 691380000000 },
  { usernameDisplay: "ArjunaCapital", lots: 630000, avgPrice: 9680, totalNominal: 609840000000 },
  { usernameDisplay: "DCA_Rutin", lots: 520000, avgPrice: 10110, totalNominal: 525720000000 },
  { usernameDisplay: "LotCollector", lots: 460000, avgPrice: 9975, totalNominal: 458850000000 },
  { usernameDisplay: "PasarPagi", lots: 410000, avgPrice: 9900, totalNominal: 405900000000 },
  { usernameDisplay: "BullishID", lots: 370000, avgPrice: 10040, totalNominal: 371480000000 },
  { usernameDisplay: "AsetJangkaPjg", lots: 330000, avgPrice: 9855, totalNominal: 325215000000 },
  { usernameDisplay: "TenangProfit", lots: 295000, avgPrice: 9790, totalNominal: 288805000000 },
  { usernameDisplay: "NabungSaham", lots: 255000, avgPrice: 9930, totalNominal: 253215000000 },
  { usernameDisplay: "SantuyTrader", lots: 210000, avgPrice: 10005, totalNominal: 210105000000 },
  { usernameDisplay: "RitelKonsisten", lots: 170000, avgPrice: 9820, totalNominal: 166940000000 },
  { usernameDisplay: "CuanPelan", lots: 140000, avgPrice: 9950, totalNominal: 139300000000 }
];

async function main() {
  await prisma.holdingEntry.deleteMany();

  await prisma.holdingEntry.createMany({
    data: seedEntries.map((entry) => ({
      usernameDisplay: entry.usernameDisplay,
      usernameKey: entry.usernameDisplay.trim().toLowerCase(),
      lots: entry.lots,
      avgPrice: entry.avgPrice,
      totalNominal: entry.totalNominal
    }))
  });

  console.log(`Seeded ${seedEntries.length} holding entries.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
