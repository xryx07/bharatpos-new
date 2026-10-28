declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import { Component } from 'react';
  import { TextProps, ColorValue } from 'react-native';

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: ColorValue;
  }

  export default class Icon extends Component<IconProps> {}
}

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.css';
