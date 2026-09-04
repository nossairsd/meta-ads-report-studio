/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client'

import { motion, HTMLMotionProps } from "motion/react"
import { Fragment } from "react"

export default function TextBlurEffect({ children, ...props }: { children: string } & HTMLMotionProps<'span'>) {
  const words = children.split(' ')
  let charIndex = 0

  return (
    <>
      {words.map((word, wordIndex) => (
        // Each word is one unbreakable inline-block so the line can only wrap
        // at the plain space between words, never mid-word between letters.
        <Fragment key={wordIndex}>
          <span style={{ display: 'inline-block' }}>
            {word.split('').map((char) => {
              const i = charIndex++
              return (
                // @ts-ignore
                <motion.span
                  style={{ display: 'inline-block', whiteSpace: 'pre' }}
                  key={i}
                  initial={{ opacity: 0, filter: 'Blur(32px)', scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, filter: 'Blur(0)', scale: 1, y: 0 }}
                  transition={{ delay: i * 0.035, ease: [1, 0, 0, 1], duration: 0.7 }}
                  {...props}
                >
                  {char}
                </motion.span>
              )
            })}
          </span>
          {wordIndex < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </>
  )
}
