package projet.spring.security;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve files from the uploads directory
        registry.addResourceHandler("/api/users/uploads/**")
                .addResourceLocations("file:uploads/");
        
        registry.addResourceHandler("/api/users/photos_profile/**")
                .addResourceLocations("file:uploads/");
    }
}