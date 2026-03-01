import React from 'react';
import { TextInput } from 'react-native';

const CustomTextInput = ({ style, ...props }) => {
  return <TextInput style={[{ fontFamily: 'CustomFont' }, style]} {...props} />;
};

export default CustomTextInput;
