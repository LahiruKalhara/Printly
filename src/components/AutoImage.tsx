import React, { useState, useEffect } from 'react';
import { View, Image, LayoutChangeEvent } from 'react-native';

interface AutoImageProps {
  uri: string;
  widthPercent: number;
}

export default function AutoImage({ uri, widthPercent }: AutoImageProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [imgHeight, setImgHeight] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  useEffect(() => {
    if (!containerWidth || !uri) return;
    const displayWidth = containerWidth * (widthPercent / 100);
    Image.getSize(
      uri,
      (w, h) => setImgHeight(displayWidth * (h / w)),
      () => setImgHeight(displayWidth * 0.4)
    );
  }, [uri, containerWidth, widthPercent]);

  const displayWidth = containerWidth * (widthPercent / 100);

  return (
    <View onLayout={onLayout} style={{ width: '100%', alignItems: 'center', marginVertical: 12 }}>
      {imgHeight > 0 && (
        <Image
          source={{ uri }}
          style={{ width: displayWidth, height: imgHeight }}
        />
      )}
    </View>
  );
}
