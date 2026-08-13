/**
 * SupportedDependencyRegistry — Single source of truth for external dependencies
 * supported by the NexSite browser preview runtime.
 */
export class SupportedDependencyRegistry {
  private static readonly SUPPORTED_PACKAGES = new Set<string>([
    'react',
    'react-dom',
    'lucide-react',
    'react-router-dom',
    'framer-motion',
    'clsx',
  ]);

  /**
   * Check whether an external package is supported in the preview runtime environment.
   */
  public static isSupported(packageName: string): boolean {
    if (!packageName) return false;
    const cleanPkg = packageName.trim().toLowerCase();
    return this.SUPPORTED_PACKAGES.has(cleanPkg);
  }

  /**
   * Get the list of all supported package names.
   */
  public static getSupportedDependencies(): string[] {
    return Array.from(this.SUPPORTED_PACKAGES);
  }

  /**
   * Get prompt guidance string for LLM agents detailing allowed dependencies.
   */
  public static getPromptGuidance(): string {
    return `CRITICAL EXTERNAL DEPENDENCY RULES:
You MUST ONLY import external dependencies from the NexSite Supported Dependency Registry:
- react (e.g. import React, { useState, useEffect, useRef } from 'react')
- react-dom (e.g. import ReactDOM from 'react-dom')
- lucide-react (e.g. import { Globe, ArrowRight, Check } from 'lucide-react')
- react-router-dom (e.g. import { Link, MemoryRouter, Routes, Route } from 'react-router-dom')
- framer-motion (e.g. import { motion, AnimatePresence } from 'framer-motion')
- clsx (e.g. import { clsx } from 'clsx')

DO NOT IMPORT any unauthorized external UI component library (such as @mui/material, antd, chakra-ui, @chakra-ui/react, recharts, bootstrap, styled-components, @emotion/react, semantic-ui-react, etc.).
If you need buttons, cards, modal overlays, tabs, sliders, grids, or menus, build them directly using HTML elements (<button>, <div>, <input>, etc.) styled with Tailwind CSS classes.`;
  }
}
