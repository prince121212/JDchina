import FAQ from "@/components/blocks/faq";
import Feature from "@/components/blocks/feature";
import Feature1 from "@/components/blocks/feature1";
import Feature2 from "@/components/blocks/feature2";
import Feature3 from "@/components/blocks/feature3";
import Hero from "@/components/blocks/hero";
import Pricing from "@/components/blocks/pricing";
import Showcase from "@/components/blocks/showcase";
import Stats from "@/components/blocks/stats";
import ResourceCategories from "@/components/blocks/resource-categories";
import PopularResources from "@/components/blocks/popular-resources";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getLandingPage } from "@/services/page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}`;

  if (locale !== "en") {
    canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}`;
  }

  return {
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getLandingPage(locale);

  return (
    <>
      {page.hero && <Hero hero={page.hero} />}

      {/* 新增：资源分类导航 */}
      <ResourceCategories />

      {/* 新增：热门资源展示 */}
      <PopularResources />

      {/* CTA 区域 - 参考原型图设计 */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="p-8 lg:p-12 text-center bg-gradient-to-r from-orange-500 to-red-500 text-white border-none rounded-xl shadow-lg">
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">分享您的知识和资源</h2>
            <p className="text-base lg:text-lg mb-8 max-w-2xl mx-auto opacity-90">
              通过上传资源，您可以让更多学人获取知识，同时也能获得社区的认可和支持。
            </p>
            <Button
              size="lg"
              className="bg-white text-orange-500 font-bold px-6 lg:px-8 py-3 lg:py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              asChild
            >
              <Link href="/upload">
                上传资源
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 保留现有统计和CTA */}
      {page.stats && <Stats section={page.stats} />}

      {/* 可选：保留部分原有组件作为补充内容 */}
    </>
  );
}
