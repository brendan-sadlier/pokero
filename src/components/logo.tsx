import React from 'react';

interface PokeroLogoProps {
  className?: string;
}

const PokeroLogo: React.FC<PokeroLogoProps> = ({ className = '' }) => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 1500 1400"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
    >
      <path
        d="M1448.559,830.233l-369.725,-640.377c-146.154,-253.141 -511.539,-253.141 -657.693,0l-369.7,640.377c-146.154,253.144 36.526,569.572 328.834,569.572l16.168,0l0,-594.54c0,-202.793 164.38,-367.188 367.171,-367.188l0.025,0c202.766,0 367.171,164.395 367.171,367.185l0,0.002c0,202.791 -164.38,367.185 -367.171,367.185l-157.015,0l0,227.355l513.101,0c292.308,0 474.988,-316.428 328.834,-569.572Z"
        fill="url(#_Linear1)"
      />
      <path
        d="M652.671,916.212c85.401,85.411 231.258,46.333 262.502,-70.337c31.269,-116.673 -75.482,-223.432 -192.153,-192.17c-116.67,31.262 -155.751,177.101 -70.349,262.507Z"
        fill="url(#_Linear2)"
      />
      <defs>
        <linearGradient
          id="_Linear1"
          x1="0"
          y1="0"
          x2="1"
          y2="0"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(1500.005746,0,0,1500.005746,-0.013407,699.901433)"
        >
          <stop offset="0" stopColor="#179a62" stopOpacity="1" />
          <stop offset="1" stopColor="#007877" stopOpacity="1" />
        </linearGradient>
        <linearGradient
          id="_Linear2"
          x1="0"
          y1="0"
          x2="1"
          y2="0"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(314.074986,0,0,314.074986,606.622609,805.229554)"
        >
          <stop offset="0" stopColor="#179a62" stopOpacity="1" />
          <stop offset="1" stopColor="#007877" stopOpacity="1" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default PokeroLogo;
