import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MarketChart = {
  prices: [number, number][];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { asset = "bitcoin" } = await req.json();

    const marketData = await fetchCoinGeckoPrices(asset);
    const series = calculateRollingVolatility(marketData.prices, 30);
    const summary = calculateRiskMetrics(series.returns);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    await supabase.from("crypto_metrics_snapshots").insert({
      asset,
      as_of: new Date().toISOString(),
      current_volatility: summary.currentVolatility,
      value_at_risk_95: summary.valueAtRisk95,
      sharpe_ratio: summary.sharpeRatio,
      maximum_drawdown: summary.maximumDrawdown,
      raw_series: series.volatilitySeries,
    });

    return new Response(JSON.stringify({
      asset,
      summary,
      volatilitySeries: series.volatilitySeries,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function fetchCoinGeckoPrices(asset: string): Promise<MarketChart> {
  const url = new URL(`https://api.coingecko.com/api/v3/coins/${asset}/market_chart`);
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("days", "120");
  url.searchParams.set("interval", "daily");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CoinGecko API failed (${response.status})`);
  }

  return response.json();
}

function calculateRollingVolatility(prices: [number, number][], windowSize: number) {
  const returns: { date: string; value: number }[] = [];

  for (let i = 1; i < prices.length; i += 1) {
    const [timestamp, price] = prices[i];
    const prevPrice = prices[i - 1][1];
    returns.push({
      date: new Date(timestamp).toISOString().slice(0, 10),
      value: Math.log(price / prevPrice),
    });
  }

  const volatilitySeries: { date: string; volatility: number }[] = [];

  for (let i = windowSize - 1; i < returns.length; i += 1) {
    const sample = returns.slice(i - (windowSize - 1), i + 1).map((point) => point.value);
    const sigma = standardDeviation(sample) * Math.sqrt(365);
    volatilitySeries.push({ date: returns[i].date, volatility: sigma });
  }

  return { returns, volatilitySeries };
}

function calculateRiskMetrics(returnsSeries: { date: string; value: number }[]) {
  const returns = returnsSeries.map((item) => item.value);
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const varIndex = Math.max(0, Math.floor(sortedReturns.length * 0.05) - 1);

  const mean = average(returns);
  const std = standardDeviation(returns);
  const sharpeRatio = std === 0 ? 0 : (mean / std) * Math.sqrt(365);

  let peak = 1;
  let portfolio = 1;
  let maxDrawdown = 0;
  for (const r of returns) {
    portfolio *= Math.exp(r);
    peak = Math.max(peak, portfolio);
    maxDrawdown = Math.min(maxDrawdown, portfolio / peak - 1);
  }

  return {
    currentVolatility: std * Math.sqrt(365),
    valueAtRisk95: sortedReturns[varIndex],
    sharpeRatio,
    maximumDrawdown: maxDrawdown,
  };
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  const avg = average(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}
