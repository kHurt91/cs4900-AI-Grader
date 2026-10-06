import katex from "katex";
import "katex/dist/katex.min.css";

interface Props {
  math: string;
}

export function InlineMath({ math }: Props) {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: false });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function BlockMath({ math }: Props) {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: true });
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
