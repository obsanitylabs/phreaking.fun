"use client";

import React, { Component, ReactNode } from "react";
import Button from "./ui/button";
import { ChevronDown } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class RainbowKitErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch() {
    // Error handling logic could be added here if needed
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <Button
            value="Connect Wallet"
            variant="primary"
            disabled
            rightIcon={<ChevronDown />}
          />
        )
      );
    }

    return this.props.children;
  }
}
