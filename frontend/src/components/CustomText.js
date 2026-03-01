import React from 'react';
import { Text } from 'react-native';

const CustomText = ({ style, ...props }) => {
  return <Text style={[{ fontFamily: 'CustomFont' }, style]} {...props} />;
};

export default CustomText;
