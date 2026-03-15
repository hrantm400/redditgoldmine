import clsx from "clsx";

const LogoMark = ({ className = "text-3xl" }) => (
  <span className={clsx("flex items-center gap-5 font-heavy text-neo-main text-4xl", className)}>
    RedditGoldmine
  </span>
);

export default LogoMark;

