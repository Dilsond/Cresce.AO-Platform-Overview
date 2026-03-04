import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

interface ParallaxCardProps {
  children: React.ReactNode;
  className?: string;
  index: number;
  delay?: number;
}

export function ParallaxCard({ children, className = '', index, delay = 0.1 }: ParallaxCardProps) {
  const ref = useRef(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  // Efeito parallax suave: move para cima conforme scrollamos
  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
  
  // Escala suave com efeito mais pronunciado
  const scale = useTransform(scrollYProgress, [0, 0.3, 0.5, 0.7, 1], [0.8, 0.95, 1, 0.95, 0.8]);
  
  // Opacidade suave
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.5, 0.8, 1], [0, 0.5, 1, 0.5, 0]);
  
  // Rotação suave para efeito 3D
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [15, 0, -15]);
  
  return (
    <motion.div
      ref={ref}
      style={{ 
        y, 
        scale, 
        opacity,
        rotateX,
        transformPerspective: 1000
      }}
      className={className}
      initial={{ opacity: 0, y: 100, scale: 0.8 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: false, amount: 0.3 }}
      transition={{ 
        duration: 0.8, 
        delay: index * delay,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      whileHover={{
        scale: 1.05,
        rotateY: 5,
        z: 50,
        transition: { duration: 0.3 }
      }}
    >
      {children}
    </motion.div>
  );
}