import React from 'react';

interface PokeroLogoProps {
  className?: string;
}

const PokeroLogo: React.FC<PokeroLogoProps> = ({ className = '' }) => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 940 1000"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      xmlSpace="preserve"
      className={className}
      style={{
        fillRule: 'evenodd',
        clipRule: 'evenodd',
        strokeLinejoin: 'round',
        strokeMiterlimit: 2,
      }}
    >
      <defs>
        <linearGradient
          id="nuxtGradient"
          x1="0"
          y1="0"
          x2="1"
          y2="0"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(-0.000493,1000,1000,0.000493,469.987317,-0)"
        >
          <stop offset="0" style={{ stopColor: 'rgb(0,164,200)', stopOpacity: 1 }} />
          <stop offset="1" style={{ stopColor: 'rgb(121,195,88)', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <path
        d="M435.646,9.982L34.339,264.811C12.954,278.39 0,301.964 0,327.296L0,966.286C0,978.586 6.697,989.908 17.475,995.831C28.253,1001.756 41.403,1001.339 51.785,994.747L373.257,790.612C394.642,777.033 407.598,753.46 407.598,728.127L407.598,391.724C407.598,378.747 414.234,366.67 425.191,359.712L452.393,342.438C463.131,335.62 476.841,335.62 487.579,342.438L674.595,461.195C681.703,465.708 686.009,473.544 686.009,481.964C686.009,490.385 681.703,498.22 674.595,502.734L561.649,574.456C543.419,586.032 532.376,606.126 532.376,627.72L532.376,728.127C532.376,753.46 545.331,777.033 566.717,790.612L888.189,994.747C898.571,1001.339 911.719,1001.756 922.498,995.832C933.276,989.909 939.974,978.586 939.974,966.286L939.974,327.296C939.974,301.964 927.018,278.39 905.633,264.811L504.328,9.982C483.368,-3.327 456.605,-3.327 435.646,9.982Z"
        fill="url(#nuxtGradient)"
        fillRule="nonzero"
      />
    </svg>
  );
};

export default PokeroLogo;
