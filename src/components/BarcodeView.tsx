import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

/**
 * Simple Code128-inspired barcode renderer.
 * Encodes each character into a binary pattern and draws bars via SVG.
 */

function textToBars(text: string): number[] {
  if (!text) return [];
  const bars: number[] = [];
  // Start pattern
  bars.push(2, 1, 1, 2, 3, 2);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) % 64;
    // Generate a 6-element pattern from char code
    bars.push(
      ((code >> 5) & 1) + 1,
      ((code >> 4) & 1) + 1,
      ((code >> 3) & 1) + 1,
      ((code >> 2) & 1) + 1,
      ((code >> 1) & 1) + 1,
      (code & 1) + 1,
    );
  }
  // Stop pattern
  bars.push(2, 3, 1, 1, 2, 1, 2);
  return bars;
}

interface BarcodeViewProps {
  value: string;
  width?: number;
  height?: number;
  color?: string;
  showText?: boolean;
}

export default function BarcodeView({
  value,
  width = 220,
  height = 70,
  color = '#000',
  showText = true,
}: BarcodeViewProps) {
  const bars = textToBars(value || '0000');
  const totalUnits = bars.reduce((sum, b) => sum + b, 0);
  const unitWidth = width / totalUnits;

  let x = 0;
  const rects: { x: number; w: number; fill: boolean }[] = [];
  bars.forEach((b, i) => {
    const w = b * unitWidth;
    rects.push({ x, w, fill: i % 2 === 0 });
    x += w;
  });

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        {rects.map((r, i) =>
          r.fill ? (
            <Rect key={i} x={r.x} y={0} width={r.w} height={height} fill={color} />
          ) : null
        )}
      </Svg>
      {showText && <Text style={[styles.label, { color }]}>{value || ''}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 4,
    letterSpacing: 2,
  },
});
