package projet.spring.clients;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;

@FeignClient(name = "installations-service", url = "http://localhost:8087")
public interface InstallationsServiceClient {
    
    @PostMapping("/api/installateurs/force-sync")
    void triggerForceSync();
}