import * as cheerio from "cheerio";

const SCHEDULE_PAGE_URL =
  process.env.SCHEDULE_PAGE_URL ??
  "https://it.pk.edu.pl/studenci/na-studiach/rozklady-zajec/";

export function excelDateToJSDate(serial: number): Date {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  return new Date(
    dateInfo.getFullYear(),
    dateInfo.getMonth(),
    dateInfo.getDate()
  );
}

export async function scrapeXlsUrl(
  pageUrl: string = SCHEDULE_PAGE_URL
): Promise<{ url: string; filename: string }> {
  const response = await fetch(pageUrl);
  const html = await response.text();
  const $ = cheerio.load(html);

  let xlsUrl = "";

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (
      href &&
      href.includes("NIESTACJONARNE") &&
      href.includes("INFORMATYKA") &&
      href.endsWith(".xls")
    ) {
      xlsUrl = href;
      return false;
    }
  });

  if (!xlsUrl) {
    throw new Error("Could not find XLS file link on the schedule page");
  }

  const filename = xlsUrl.split("/").pop() ?? xlsUrl;

  return { url: xlsUrl, filename };
}

export async function downloadXls(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}
