"use client";

import * as motion from "motion/react-m";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

const MotionSpan = motion.create("span");

export function MotionButton(props: ComponentProps<typeof Button>) {
  return (
    <MotionSpan
      className="inline-block"
      initial={{ scale: 1 }}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.15 }}
    >
      <Button {...props} />
    </MotionSpan>
  );
}
