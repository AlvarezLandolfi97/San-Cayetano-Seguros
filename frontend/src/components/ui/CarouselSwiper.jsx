import { Children } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, A11y } from "swiper/modules";
import "./CarouselSwiper.css";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export default function CarouselSwiper({
  children,
  autoplay = true,
  loop = true,
  spaceBetween = 20,
  slidesPerView = 1,
  breakpoints = {
    640: { slidesPerView: 1 },
    768: { slidesPerView: 2 },
    1024: { slidesPerView: 3 },
  },
}) {
  return (
    <div className="carousel-wrapper">
      <Swiper
        modules={[Navigation, Pagination, Autoplay, A11y]}
        spaceBetween={spaceBetween}
        slidesPerView={slidesPerView}
        breakpoints={breakpoints}
        loop={loop}
        navigation
        pagination={{ clickable: true }}
        autoplay={autoplay ? { delay: 3000, disableOnInteraction: false } : false}
        a11y={{
          prevSlideMessage: "Anterior plan",
          nextSlideMessage: "Siguiente plan",
        }}
        className="plans-swiper"
      >
        {Children.map(children, (child, i) => (
          <SwiperSlide key={i}>{child}</SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
