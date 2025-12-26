import {
  GitChangelog,
  GitChangelogMarkdownSection,
} from "@nolebase/vitepress-plugin-git-changelog/vite";
import {
  PageProperties,
  PagePropertiesMarkdownSection,
} from "@nolebase/vitepress-plugin-page-properties/vite";
import { fileURLToPath, URL } from "node:url";
import UnoCSS from "unocss/vite";
import Devtools from "vite-plugin-vue-devtools";
import type { DefaultTheme, Plugin, UserConfig } from "vitepress";
import { hostname, sidebar, siteConfig } from "./constants";
import { generateImages, generateMeta } from "./hooks";
import { configureMarkdown } from "./markdown";
import { aliases, defs, movePlugin } from "./markdown/emoji";

const GIT_COMMIT =
  process.env.NODE_ENV === "development"
    ? "dev"
    : /** Github actions commit hash */
      process.env.GITHUB_SHA ??
      /** Commit hash from git */
      (await (await import("tinyexec"))
        .x("git", ["rev-parse", "HEAD"])
        .then((result) => result.stdout.trim())) ??
      "dev";

export const shared: UserConfig<DefaultTheme.Config> = {
  ...siteConfig,
  head: [
    [
      "style",
      {},
      `
      @font-face {
        font-family: 'Pacifico';
        src: url('/fonts/Pacifico-Regular.ttf') format('truetype');
        font-weight: 400;
        font-display: swap;
      }
      @font-face {
        font-family: 'Source Serif 4 Variable';
        src: url('/fonts/SourceSerif4-VariableFont_opsz,wght.ttf') format('truetype');
        font-display: swap;
      }
    `,
    ],
  ],
  transformHead: async (context) => generateMeta(context, hostname),
  buildEnd: async (context) => {
    generateImages(context);
  },
  markdown: {
    emoji: { defs, shortcuts: aliases },
    config(md) {
      configureMarkdown(md);
    },
  },
  themeConfig: {
    search: {
      options: {
        miniSearch: {
          searchOptions: {
            combineWith: "AND",
            fuzzy: false,
            // @ts-ignore
            boostDocument: (
              _,
              term,
              storedFields: Record<string, string | string[]>
            ) => {
              const titles = (storedFields?.titles as string[])
                .filter((t) => Boolean(t))
                .map((t) => t.toLowerCase());
              // Uprate if term appears in titles. Add bonus for higher levels (i.e. lower index)
              const titleIndex =
                titles
                  .map((t, i) => (t?.includes(term) ? i : -1))
                  .find((i) => i >= 0) ?? -1;
              if (titleIndex >= 0) return 10000 - titleIndex;

              return 1;
            },
          },
        },
        detailedView: true,
      },
      provider: "local",
    },
    logo: { src: "/asset/logosmall.webp" },
    sidebar,
    // nav,
    socialLinks: [
      { icon: "github", link: "https://github.com/HyDocs/hydocs.github.io" },
      { icon: "discord", link: "https://discord.gg/QMseZUzJdK" },
      { icon: "reddit", link: "https://www.reddit.com/r/HyDocs/" },
    ],
    footer: {
      message: `<a href="https://github.com/HyDocs">The HyDocs Team</a> <span class="divider">|</span> <a href="https://github.com/HyDocs/hydocs.github.io/commit/${GIT_COMMIT}">${GIT_COMMIT.slice(
        0,
        7
      )}</a>`,
      copyright: "Made with love and Magic Find.",
    },
  },
  vite: {
    build: {
      cssTarget: "chrome100",
      cssMinify: 'esbuild'
    },
    experimental: {
      enableNativePlugin: true,
    },
    optimizeDeps: {
      exclude: [
        "@nolebase/vitepress-plugin-enhanced-readabilities/client",
        "@nolebase/vitepress-plugin-git-changelog/client",
        "@nolebase/vitepress-plugin-page-properties/client",
      ],
    },
    ssr: {
      noExternal: [
        "@nolebase/vitepress-plugin-enhanced-readabilities",
        "@nolebase/vitepress-plugin-page-properties",
        "@nolebase/vitepress-plugin-git-changelog",
        "@nolebase/ui",
        "@fmhy/components",
      ],
    },
    plugins: [
      Devtools(),
      PageProperties(),
      PagePropertiesMarkdownSection(),
      GitChangelog({
        maxGitLogCount: 20,
        repoURL: "https://github.com/HyDocs/hydocs.github.io",
      }),
      GitChangelogMarkdownSection({ sections: { disableContributors: true } }),
      UnoCSS({
        configFile: "../unocss.config.ts",
      }),
      {
        name: "custom:adjust-order",
        configResolved(c) {
          movePlugin(
            c.plugins as unknown as Plugin[],
            "vitepress",
            "before",
            "unocss:transformers:pre"
          );
          movePlugin(
            c.plugins as unknown as Plugin[],
            "custom:tooltip-loader",
            "before",
            "vitepress"
          );
        },
      },
    ],
    resolve: {
      alias: [
        {
          find: /^.*\/VPBadge\.vue$/,
          replacement: fileURLToPath(
            new URL("../theme/components/Badge.vue", import.meta.url)
          ),
        },
        {
          find: /^.*\/VPNavBarSearch\.vue$/,
          replacement: fileURLToPath(
            new URL("../theme/components/NavBarSearch.vue", import.meta.url)
          ),
        },
      ],
    },
  },
};
