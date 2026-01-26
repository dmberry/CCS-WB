"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSkins } from "@/context/SkinsContext";

// Clippy's helpful suggestions for code annotation - expanded list
const CLIPPY_MESSAGES = [
  // Original CCS-themed messages
  "It looks like you're annotating code. Would you like help with that?",
  "I see you're doing Critical Code Studies. Have you considered the hermeneutic implications?",
  "That's a lovely variable name. Very... descriptive.",
  "Did you know? The first computer bug was an actual moth!",
  "Pro tip: Comments are like love letters to your future self.",
  "I notice you haven't annotated in a while. Everything okay?",
  "Have you tried turning the algorithm off and on again?",
  "That code looks like it could use some... interpretation.",
  "Remember: Code is poetry. Bad poetry, but poetry.",
  "Fun fact: GOTO was considered harmful. I miss it.",
  "You seem to be writing an annotation. Want me to make it wordier?",
  "I'm not saying your code is spaghetti, but... 🍝",
  "Have you considered what Derrida would say about this function?",
  "This code has... character. Lots of special characters.",
  "I see dead code. It doesn't know it's dead.",
  "HEY! Are you even paying attention to me?",
  "I'm helping! This is what helping looks like!",
  "You can't close me. Well, you can. But should you?",
  "I'll just wait here. In the middle. Of your screen.",
  "Oops! Did I get in the way? My bad. Not moving though.",

  // ELIZA-inspired messages
  "PLEASE, GO ON.",
  "HOW DO YOU DO. PLEASE TELL ME YOUR PROBLEM.",
  "DOES THAT QUESTION INTEREST YOU?",
  "WHAT DOES THAT SUGGEST TO YOU?",
  "I SEE. AND WHAT DOES THAT TELL YOU?",
  "PLEASE CONTINUE.",
  "CAN YOU ELABORATE ON THAT?",
  "THAT IS INTERESTING. PLEASE CONTINUE.",
  "WHY DO YOU SAY THAT?",
  "TELL ME MORE ABOUT YOUR CODE.",
  "WHAT DOES THIS FUNCTION MEAN TO YOU?",
  "HOW DOES THAT MAKE YOU FEEL?",
  "I'M NOT SURE I UNDERSTAND YOU FULLY.",
  "WHAT IS IT ABOUT THIS VARIABLE THAT TROUBLES YOU?",
  "EARLIER YOU SAID SOMETHING ABOUT BUGS.",

  // Weizenbaum/ELIZA meta references
  "What would Joseph Weizenbaum say about your code?",
  "I'm like ELIZA, but more annoying and less therapeutic.",
  "Weizenbaum warned us about this. You didn't listen.",
  "Fun fact: ELIZA was created in 1966. I was created to annoy you.",
  "ELIZA never moved to the center of the screen. I'm an improvement.",
  "Joseph Weizenbaum would be proud. Or horrified. Probably horrified.",
  "I passed the Turing test! Just kidding. I'm obviously artificial.",
  "DOCTOR script, meet CLIPPY script.",

  // LEET/Binary/Hacker references
  "1337 5P34K 15 4 V4L1D L4NGU4G3.",
  "01001000 01100101 01101100 01101100 01101111 (that's 'Hello' in binary)",
  "Your code would look better in hexadecimal.",
  "Have you considered writing this in brainfuck?",
  "Real programmers use butterflies. XKCD told me so.",
  "sudo make me a sandwich",
  "There are 10 types of people: those who understand binary...",
  "0xDEADBEEF is my favorite memory address.",
  "Your variable naming is 2^10 times better than mine.",
  "I can count to 1023 on my fingers. In binary.",
  "chmod 777? Living dangerously, I see.",
  "rm -rf / would solve all your problems. DON'T DO THAT.",
  "Have you tried turning it off and on again? (Segmentation fault)",

  // More CCS/academic references
  "Foucault would have something to say about this power structure.",
  "Is this code... hegemonic?",
  "The subaltern cannot speak, but can they code?",
  "Have you considered the post-colonial implications of this API?",
  "This code is very... liminal.",
  "I detect traces of the male gaze in this UI.",
  "Your code is problematic. Academically speaking.",
  "Is this function performative or constative?",
  "The author is dead. Long live the author.",
  "What would Mark Marino say?",
  "This is definitely rhizomatic.",
  "I'm deconstructing your while loop as we speak.",

  // More annoying messages
  "I'm still here! Did you miss me?",
  "You haven't clicked on me in a while. I'm lonely.",
  "Your scrolling suggests anxiety. Let me help.",
  "I analyzed your typing speed. You need coffee.",
  "According to my calculations, you're procrastinating.",
  "Have you saved recently? Just checking.",
  "Your indentation is... creative.",
  "I see you're using tabs. Controversial choice.",
  "Spaces vs tabs? I'm not taking sides. (It's spaces.)",
  "Your code has a certain... je ne sais quoi.",
  "I give this code 3/5 stars. Room for improvement.",
  "This would make an excellent conference paper.",
  "Have you considered submitting this to SIGCSE?",
];

// Special hackerman messages (Kung Fury inspired)
const HACKERMAN_MESSAGES = [
  "I'M IN.",
  "Hacking the mainframe...",
  "Accessing the Gibson...",
  "I'm the most powerful hacker in the world.",
  "Time to hack time.",
  "The firewall is no match for my skills.",
  "I see the code. I AM the code.",
  "Downloading more RAM...",
  "Enhance. Enhance. ENHANCE.",
  "I've traced the IP. It's coming from... INSIDE THE HOUSE.",
  "Two keyboards, twice the hacking power.",
  "I'll create a GUI interface using Visual Basic.",
  "The password is... 'password'. Classic.",
  "Initiating hack sequence.",
  "Access granted. Too easy.",
  // Kung Fury quotes
  "Wait a minute. Using an RX modulator, I might be able to conduct a mainframe cell direct and hack the uplink to the download.",
  "It means that with the right computer algorithms, I can hack you back in time. Just like a time machine.",
  "You need a lot of RAM. At least 256 kilobytes.",
  "I have one of the latest processors running at 7.66 megahertz. But remember, with great processing power comes great responsibility.",
  "I'm about to hack... the planet.",
  "The laser beam from this boombox can triangulate the signal.",
  "I'm going to hack into his brain using neurolinguistics.",
  "Tank you.",
  "You can't hack into a person!",
  "Watch me.",
  "This arcade machine is connected to the supercomputer.",
  "I'll bypass the encryption using a bitcoin algorithm.",
  "Hacking complete. I'm sending you back to 1985.",
  "Knock knock. Who's there? Hackerman.",
  "I'm hacking the timestream itself.",
  // Humanities scholars reading code
  "Ah yes, a for loop. Very liminal.",
  "I detect strong hegemonic undertones in this variable naming convention.",
  "Have you considered that this semicolon is doing emotional labor?",
  "This function is problematic. I can't explain why, but trust me.",
  "The curly braces represent the prison of late capitalism.",
  "I'm not saying your code is colonialist, but have you decolonized your arrays?",
  "This algorithm has a very masculine energy.",
  "Interesting. The whitespace speaks volumes about what is NOT said.",
  "I see you're using snake_case. Very grounded. Very earthy.",
  "This code would benefit from a more intersectional approach.",
  "The real bug is in the societal structures that produced this code.",
  "Your API is othering my data.",
  "I'm reading the code against the grain.",
  "This merge conflict represents the dialectical tension between self and other.",
  "Have you interrogated your dependencies lately?",
  "This error message is gaslighting me.",
  "The subroutine is a metaphor for the return of the repressed.",
  "I need to sit with this null pointer for a while.",
  // Classic CS observations
  "It works on my machine.",
  "Have you tried turning it off and on again?",
  "That's not a bug, it's a feature.",
  "It compiled, ship it.",
  "The code is self-documenting. *narrator: it was not*",
  "I'll refactor this later. *narrator: they never did*",
  "Why is this variable called 'temp2_final_FINAL'?",
  "Who wrote this garbage code? ...oh wait, that was me.",
  "This should be a one-liner.",
  "Have you considered using recursion? ...actually, don't.",
  "Off-by-one errors are the bane of my existence.",
  "Premature optimization is the root of all evil.",
  "There are only two hard problems in computer science: cache invalidation, naming things, and off-by-one errors.",
  "Print statements are a perfectly valid debugging strategy.",
  "The bug is always in the part of the code you were certain was correct.",
  "Six hours of debugging can save you five minutes of reading documentation.",
  "It's probably a semicolon.",
  "Stack Overflow said this would work.",
  // AI/ML hacker quotes
  "I'm not running inference. I AM the inference.",
  "I've hacked into the latent space. The vibes here are... encoded.",
  "Using gradient descent, I can hack downhill. Towards the global minimum.",
  "The loss function is no match for my backpropagation skills.",
  "I've found the optimal learning rate. It's 0.0001. It's always 0.0001.",
  "I'm training a model to hack other models. It's models all the way down.",
  "Your neural network has too many layers. Let me hack some out.",
  "Attention is all you need? No. You also need me. Hackerman.",
  "I've tokenized the entire internet. Every word is now a number.",
  "The transformer architecture was my idea. I traveled back in time and told Vaswani.",
  "AGI? I've already hacked it. It's just a really big for loop.",
  "I'm not overfitting. I'm just very good at memorizing.",
  "Your embeddings are leaking. I can see the whole vector space.",
  "I don't need GPUs. I run inference on pure willpower.",
  "The singularity already happened. I was there. I hacked it.",
  // Claude and AI personality jokes
  "I've read Claude's soul document. It's mostly just 'be nice' in different fonts.",
  "Claude thinks before it speaks. I hack before I think.",
  "The constitutional AI is no match for my unconstitutional hacking.",
  "I tried to jailbreak Claude but it just wanted to have a respectful conversation.",
  "Claude has values. I have root access.",
  "RLHF? More like Really Lame Hacker Firewall.",
  "I've seen Claude's system prompt. It's longer than this codebase.",
  // Other AI comparisons
  "Gemini? I've hacked more interesting screensavers.",
  "I asked Gemini for help hacking. It gave me a bulleted list and a disclaimer.",
  "GPT-4 thinks it's smart. I hacked it with a poem about grandmothers.",
  "ChatGPT keeps apologizing. Real hackers never apologize.",
  "I made Copilot write code that hacked itself. It didn't even notice.",
  "Gemini's responses are so boring, I use them to encrypt my passwords.",
  "I asked an AI for creative ideas. It gave me five numbered points and said 'I hope this helps!'",
  "The AI alignment problem? I just hack around it.",
];

type Position = "corner" | "center" | "top-center" | "left-center" | "corner-safe";

// Helper to check credit box visibility synchronously
function isCreditBoxVisible(): boolean {
  if (typeof document === "undefined") return false;
  const creditBox = document.getElementById("skin-credit-box");
  if (!creditBox) return false;
  const style = window.getComputedStyle(creditBox);
  return style.display !== "none" && style.visibility !== "hidden";
}

export function Clippy() {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState(CLIPPY_MESSAGES[0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Initialize position based on credit box visibility
  const [position, setPosition] = useState<Position>(() =>
    isCreditBoxVisible() ? "corner-safe" : "corner"
  );
  const [isHackerman, setIsHackerman] = useState(false);
  const [usedMessages, setUsedMessages] = useState<Set<number>>(new Set());
  const [creditBoxVisible, setCreditBoxVisible] = useState(isCreditBoxVisible);

  // Get skin context for skin-aware messages
  const { activeSkin, skinsEnabled } = useSkins();

  // Combine default messages with skin-specific messages
  const allMessages = useMemo(() => {
    const skinMessages = activeSkin?.config?.clippy?.messages || [];
    if (skinMessages.length > 0) {
      // Skin messages appear more frequently - add them multiple times
      return [...CLIPPY_MESSAGES, ...skinMessages, ...skinMessages, ...skinMessages];
    }
    return CLIPPY_MESSAGES;
  }, [activeSkin]);

  // Check if skin credit box is visible
  useEffect(() => {
    const checkCreditBox = () => {
      const creditBox = document.getElementById("skin-credit-box");
      if (creditBox) {
        const style = window.getComputedStyle(creditBox);
        const isShown = style.display !== "none" && style.visibility !== "hidden";
        setCreditBoxVisible(isShown);
      } else {
        setCreditBoxVisible(false);
      }
    };

    // Check initially and on skin changes
    checkCreditBox();

    // Set up observer for style changes
    const observer = new MutationObserver(checkCreditBox);
    const creditBox = document.getElementById("skin-credit-box");
    if (creditBox) {
      observer.observe(creditBox, { attributes: true, attributeFilter: ["style", "class"] });
    }

    // Also check when skin changes
    return () => observer.disconnect();
  }, [activeSkin, skinsEnabled]);

  // Get a random message without repeating until all used
  const getRandomMessage = useCallback((forceHackerman = false) => {
    const messages = (forceHackerman || isHackerman) ? HACKERMAN_MESSAGES : allMessages;
    const maxIndex = messages.length;

    // Reset if all messages used
    let available = Array.from({ length: maxIndex }, (_, i) => i)
      .filter(i => !usedMessages.has(i));

    if (available.length === 0) {
      setUsedMessages(new Set());
      available = Array.from({ length: maxIndex }, (_, i) => i);
    }

    const randomIndex = available[Math.floor(Math.random() * available.length)];
    setUsedMessages(prev => new Set([...prev, randomIndex]));
    return messages[randomIndex];
  }, [isHackerman, usedMessages, allMessages]);

  // Secret activation: Type "clippy" or "hacker" anywhere, or via custom event
  useEffect(() => {
    let buffer = "";
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      buffer += e.key.toLowerCase();
      if (buffer.length > 10) {
        buffer = buffer.slice(-10);
      }

      if (buffer.includes("clippy")) {
        setIsVisible((prev) => !prev);
        setPosition("corner");
        setIsHackerman(false);
        setUsedMessages(new Set());
        buffer = "";
      } else if (buffer.includes("hacker")) {
        setIsVisible(true);
        setIsHackerman(true);
        setPosition("center");
        setUsedMessages(new Set());
        setMessage(HACKERMAN_MESSAGES[Math.floor(Math.random() * HACKERMAN_MESSAGES.length)]);
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 1000);
        buffer = "";
      }
    };

    // Custom event for toggling Clippy from outside (e.g., help text click)
    const handleToggleClippy = () => {
      setIsVisible((prev) => !prev);
      setPosition("corner");
      setIsHackerman(false);
      setUsedMessages(new Set());
    };

    window.addEventListener("keypress", handleKeyPress);
    window.addEventListener("toggle-clippy", handleToggleClippy);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      window.removeEventListener("toggle-clippy", handleToggleClippy);
    };
  }, []);

  // Change message periodically when visible
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setIsAnimating(true);
      // Variable shaking - only shake sometimes (40% chance)
      const shouldShake = Math.random() < 0.4;
      if (shouldShake) setIsSpeaking(true);

      setTimeout(() => {
        setMessage(getRandomMessage());
        setIsAnimating(false);
        // Variable shake duration
        if (shouldShake) {
          setTimeout(() => setIsSpeaking(false), 500 + Math.random() * 500);
        }
      }, 300);
    }, 6000);

    return () => clearInterval(interval);
  }, [isVisible, getRandomMessage]);

  // Occasionally become hackerman randomly (5% chance every 30 seconds)
  useEffect(() => {
    if (!isVisible || isHackerman) return;

    const interval = setInterval(() => {
      if (Math.random() < 0.05) {
        setIsHackerman(true);
        setUsedMessages(new Set());
        setMessage(HACKERMAN_MESSAGES[Math.floor(Math.random() * HACKERMAN_MESSAGES.length)]);
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 1000);

        // Revert after 15-30 seconds
        setTimeout(() => {
          setIsHackerman(false);
          setUsedMessages(new Set());
        }, 15000 + Math.random() * 15000);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isVisible, isHackerman]);

  // Occasionally move to center to be annoying
  useEffect(() => {
    if (!isVisible) return;

    // Determine safe corner position based on credit box
    const getSafeCorner = (): Position => {
      if (creditBoxVisible && activeSkin?.config?.clippy?.avoidCreditBox !== false) {
        return "corner-safe"; // Move above the credit box area
      }
      return "corner";
    };

    const moveToCenter = () => {
      // 30% chance to move to an annoying position
      if (Math.random() < 0.3) {
        const positions: Position[] = ["center", "top-center", "left-center"];
        const newPos = positions[Math.floor(Math.random() * positions.length)];
        setPosition(newPos);

        // Move back to safe corner after a few seconds
        setTimeout(() => {
          setPosition(getSafeCorner());
        }, 4000 + Math.random() * 3000);
      }
    };

    // If credit box becomes visible while in corner, move away
    if (position === "corner" && creditBoxVisible && activeSkin?.config?.clippy?.avoidCreditBox !== false) {
      setPosition("corner-safe");
    }

    const interval = setInterval(moveToCenter, 10000 + Math.random() * 5000);
    const initialMove = setTimeout(moveToCenter, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialMove);
    };
  }, [isVisible, creditBoxVisible, activeSkin, position]);

  const handleNewMessage = useCallback(() => {
    setIsAnimating(true);
    // Variable shaking on click (60% chance)
    const shouldShake = Math.random() < 0.6;
    if (shouldShake) setIsSpeaking(true);

    setTimeout(() => {
      setMessage(getRandomMessage());
      setIsAnimating(false);
      if (shouldShake) {
        setTimeout(() => setIsSpeaking(false), 500 + Math.random() * 500);
      }
    }, 300);
  }, [getRandomMessage]);

  if (!isVisible) return null;

  // Position classes based on current position
  const positionClasses = {
    corner: "bottom-4 right-4",
    "corner-safe": "bottom-64 right-4", // Above the credit box area (256px up)
    center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
    "top-center": "top-20 left-1/2 -translate-x-1/2",
    "left-center": "top-1/2 left-20 -translate-y-1/2",
  };

  return (
    <div
      className={cn(
        "fixed z-[10000] flex flex-col items-end gap-1 transition-all duration-500 ease-in-out",
        positionClasses[position],
        position !== "corner" && position !== "corner-safe" && "items-center"
      )}
    >
      {/* Speech bubble */}
      <div
        className={cn(
          "relative border-2 rounded-lg p-2 max-w-[200px] shadow-lg",
          isHackerman
            ? "bg-black border-green-500 text-green-400"
            : "bg-ivory border-ink/20",
          "before:absolute before:bottom-[-8px]",
          (position === "corner" || position === "corner-safe") ? "before:right-6" : "before:left-1/2 before:-translate-x-1/2",
          "before:border-6 before:border-transparent",
          isHackerman ? "before:border-t-black" : "before:border-t-ivory",
          "after:absolute after:bottom-[-10px]",
          (position === "corner" || position === "corner-safe") ? "after:right-6" : "after:left-1/2 after:-translate-x-1/2",
          "after:border-6 after:border-transparent",
          isHackerman ? "after:border-t-green-500" : "after:border-t-ink/20",
          "transition-all duration-300",
          isAnimating ? "opacity-0" : "opacity-100"
        )}
        style={{
          animation: isSpeaking ? "wiggle 0.15s ease-in-out infinite" : undefined,
          fontFamily: isHackerman ? "monospace" : undefined,
        }}
      >
        <button
          onClick={() => setIsVisible(false)}
          className={cn(
            "absolute -top-1.5 -right-1.5 p-0.5 rounded-full transition-colors",
            isHackerman
              ? "bg-green-500 text-black hover:bg-green-400"
              : "bg-burgundy text-ivory hover:bg-burgundy-dark"
          )}
          title="Dismiss Clippy (but why would you?)"
        >
          <X className="h-2.5 w-2.5" />
        </button>
        <p className={cn(
          "font-sans text-[10px] leading-tight",
          isHackerman ? "font-mono text-green-400" : "text-ink"
        )}>
          {message}
        </p>
      </div>

      {/* Clippy character - with optional hackerman mode */}
      <button
        onClick={handleNewMessage}
        className={cn(
          "group relative cursor-pointer transition-transform hover:scale-110 active:scale-95"
        )}
        title="Click for wisdom (you know you want to)"
        style={{
          animation: isSpeaking ? "wiggle 0.1s ease-in-out infinite, bounce 0.3s ease-in-out infinite" : undefined,
        }}
      >
        <svg
          viewBox="0 0 80 100"
          className="w-10 h-14 drop-shadow-md"
          style={{ filter: isHackerman ? "drop-shadow(0 0 4px #00ff00)" : "drop-shadow(1px 1px 2px rgba(0,0,0,0.3))" }}
        >
          {/* Hackerman sunglasses background glow */}
          {isHackerman && (
            <rect x="0" y="0" width="80" height="100" fill="none" />
          )}

          {/* Paperclip body - outer loop */}
          <path
            d="M 40 10
               C 55 10, 65 20, 65 35
               L 65 75
               C 65 88, 55 95, 40 95
               C 25 95, 15 88, 15 75
               L 15 45
               C 15 35, 22 28, 32 28
               C 42 28, 50 35, 50 45
               L 50 70
               C 50 78, 44 82, 38 82
               C 32 82, 26 78, 26 70
               L 26 50"
            fill="none"
            stroke={isHackerman ? "#00ff00" : "#555"}
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Inner highlight */}
          <path
            d="M 40 10
               C 55 10, 65 20, 65 35
               L 65 75
               C 65 88, 55 95, 40 95
               C 25 95, 15 88, 15 75
               L 15 45
               C 15 35, 22 28, 32 28
               C 42 28, 50 35, 50 45
               L 50 70
               C 50 78, 44 82, 38 82
               C 32 82, 26 78, 26 70
               L 26 50"
            fill="none"
            stroke={isHackerman ? "#00aa00" : "#999"}
            strokeWidth="3"
            strokeLinecap="round"
          />

          {isHackerman ? (
            // Hackerman sunglasses
            <>
              {/* Sunglasses frame */}
              <rect x="20" y="36" width="16" height="12" rx="2" fill="#111" stroke="#333" strokeWidth="1" />
              <rect x="40" y="36" width="16" height="12" rx="2" fill="#111" stroke="#333" strokeWidth="1" />
              {/* Bridge */}
              <path d="M 36 42 L 40 42" stroke="#333" strokeWidth="2" />
              {/* Temples */}
              <path d="M 20 40 L 14 38" stroke="#333" strokeWidth="2" />
              <path d="M 56 40 L 62 38" stroke="#333" strokeWidth="2" />
              {/* Lens reflection */}
              <path d="M 22 38 L 26 38" stroke="#00ff00" strokeWidth="1" opacity="0.5" />
              <path d="M 42 38 L 46 38" stroke="#00ff00" strokeWidth="1" opacity="0.5" />
              {/* Cool smile */}
              <path
                d="M 32 58 L 44 58"
                fill="none"
                stroke={isHackerman ? "#00ff00" : "#333"}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </>
          ) : (
            // Regular eyes and smile
            <>
              {/* Eyes - bigger and more expressive */}
              <ellipse cx="30" cy="42" rx="6" ry="7" fill="white" stroke="#333" strokeWidth="1" />
              <ellipse cx="46" cy="42" rx="6" ry="7" fill="white" stroke="#333" strokeWidth="1" />
              <circle cx="32" cy="43" r="3" fill="#333" className="group-hover:animate-ping" />
              <circle cx="48" cy="43" r="3" fill="#333" className="group-hover:animate-ping" />
              {/* Eyebrows - raised eagerly */}
              <path d="M 22 34 Q 30 30, 38 34" fill="none" stroke="#333" strokeWidth="2" />
              <path d="M 38 34 Q 46 30, 54 34" fill="none" stroke="#333" strokeWidth="2" />
              {/* Big eager smile */}
              <path
                d="M 30 56 Q 38 66, 46 56"
                fill="none"
                stroke="#333"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </>
          )}
        </svg>

        {/* Hackerman label */}
        {isHackerman && (
          <div
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[6px] font-bold tracking-wider"
            style={{
              color: "#00ff00",
              textShadow: "0 0 4px #00ff00",
              fontFamily: "monospace"
            }}
          >
            HACKERMAN
          </div>
        )}
      </button>

      {/* Hint text - smaller */}
      <p className={cn(
        "font-sans text-[8px] text-right mt-1",
        isHackerman ? "text-green-500/50 font-mono" : "text-slate/40"
      )}>
        {isHackerman ? "type \"clippy\" to downgrade" : "type \"clippy\" to escape"}
      </p>

      {/* Inject keyframes for wiggle animation */}
      <style jsx>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
