"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { commonMessages } from "@/messages/common";

const subscribeToMount = () => () => {};
const getClientMountState = () => true;
const getServerMountState = () => false;

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeToMount, getClientMountState, getServerMountState);

  const isDark = !mounted || resolvedTheme !== "light";
  const tooltip = isDark ? commonMessages.actions.switchToLight : commonMessages.actions.switchToDark;

  return (
    <Tooltip>
      <TooltipTrigger render={<Button aria-label={commonMessages.actions.changeTheme} size="icon" variant="ghost" onClick={() => setTheme(isDark ? "light" : "dark")} />}>
        {isDark ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
