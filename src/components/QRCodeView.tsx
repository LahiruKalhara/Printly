import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import QRCodeLib from 'qrcode';

interface QRCodeViewProps {
  value: string;
  size?: number;
  color?: string;
  bgColor?: string;
}

export default function QRCodeView({
  value,
  size = 100,
  color = '#000',
  bgColor = '#FFF',
}: QRCodeViewProps) {
  const [modules, setModules] = useState<boolean[][]>([]);

  useEffect(() => {
    if (!value) return;
    try {
      const qr = QRCodeLib.create(value, { errorCorrectionLevel: 'M' });
      const data = qr.modules.data;
      const moduleCount = qr.modules.size;
      const grid: boolean[][] = [];
      for (let row = 0; row < moduleCount; row++) {
        const rowData: boolean[] = [];
        for (let col = 0; col < moduleCount; col++) {
          rowData.push(!!data[row * moduleCount + col]);
        }
        grid.push(rowData);
      }
      setModules(grid);
    } catch {
      setModules([]);
    }
  }, [value]);

  if (modules.length === 0) return null;

  const cellSize = size / modules.length;

  return (
    <View style={[styles.container, { width: size, height: size, backgroundColor: bgColor }]}>
      {modules.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((cell, colIndex) => (
            <View
              key={colIndex}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: cell ? color : bgColor,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
});
