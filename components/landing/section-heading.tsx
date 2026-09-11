"use client";

import { motion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The heading every landing section opens with: an eyebrow, a title and a
 * line of context.
 *
 * One component rather than a copy per section, so the page reads as one
 * design: the same eyebrow, the same type scale, the same entrance. The title
 * arrives word by word out of a blur — a transition that marks each new
 * section without the whole block jumping into place at once.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className = "",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) {
  const centered = align === "center";
  const words = title.split(" ");

  return (
    <div className={`${centered ? "mx-auto max-w-3xl text-center" : "max-w-xl text-left"} ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.6, ease: EASE }}
        className={`flex items-center gap-3 ${centered ? "justify-center" : ""}`}
      >
        {centered && (
          <span aria-hidden className="h-px w-10 bg-gradient-to-r from-transparent to-primary/50" />
        )}
        <span className="bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#0EA5E9] bg-clip-text text-xs font-semibold tracking-[0.24em] text-transparent uppercase sm:text-[13px]">
          {eyebrow}
        </span>
        <span aria-hidden className="h-px w-10 bg-gradient-to-l from-transparent to-primary/50" />
      </motion.div>

      <h2 className="mt-5 text-[2rem] leading-[1.1] font-medium tracking-[-0.025em] text-[#0B1220] md:text-5xl">
        {words.map((word, i) => (
          <span key={i}>
            <motion.span
              className="inline-block"
              initial={{ opacity: 0, y: "0.35em", filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: "0em", filter: "blur(0px)" }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ delay: 0.08 + i * 0.045, duration: 0.7, ease: EASE }}
            >
              {word}
            </motion.span>
            {/* A real space between words, outside the animated span, so the
                title still wraps where it should. */}
            {i < words.length - 1 && " "}
          </span>
        ))}
      </h2>

      {description && (
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ delay: 0.25, duration: 0.7, ease: EASE }}
          className={`mt-5 text-base leading-relaxed text-foreground/60 lg:text-lg ${centered ? "mx-auto max-w-2xl" : "max-w-lg"}`}
        >
          {description}
        </motion.p>
      )}
    </div>
  );
}
