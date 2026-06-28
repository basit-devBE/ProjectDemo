package com.skillbridge.portfolio.service;

import com.skillbridge.portfolio.dto.request.PortfolioItemRequest;
import com.skillbridge.portfolio.dto.request.PortfolioItemUpdateRequest;
import com.skillbridge.portfolio.dto.request.VerificationDecisionRequest;
import com.skillbridge.portfolio.dto.response.PortfolioItemResponse;
import com.skillbridge.portfolio.dto.response.ShareLinkResponse;
import com.skillbridge.portfolio.dto.response.VerificationRequestResponse;
import com.skillbridge.portfolio.entity.PortfolioItem;
import com.skillbridge.portfolio.entity.PortfolioLink;
import com.skillbridge.portfolio.entity.VerificationRequest;
import com.skillbridge.portfolio.exception.AiServiceException;
import com.skillbridge.portfolio.exception.DuplicateVerificationException;
import com.skillbridge.portfolio.exception.PortfolioItemNotFoundException;
import com.skillbridge.portfolio.exception.VerificationAlreadyResolvedException;
import com.skillbridge.portfolio.exception.VerificationRequestNotFoundException;
import com.skillbridge.portfolio.repository.PortfolioItemRepository;
import com.skillbridge.portfolio.repository.PortfolioLinkRepository;
import com.skillbridge.portfolio.repository.VerificationRequestRepository;
import com.skillbridge.portfolio.service.dto.ClaudeVerificationResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PortfolioServiceImpl implements PortfolioService {

    private static final Logger log = LoggerFactory.getLogger(PortfolioServiceImpl.class);

    private final PortfolioItemRepository portfolioItemRepository;
    private final VerificationRequestRepository verificationRequestRepository;
    private final PortfolioLinkRepository portfolioLinkRepository;
    private final ShareTokenGenerator shareTokenGenerator;
    private final ClaudeVerificationService claudeVerificationService;

    @Override
    public PortfolioItemResponse createItem(PortfolioItemRequest request, UUID userId) {
        PortfolioItem item = new PortfolioItem();
        item.setUserId(userId);
        item.setItemType(request.itemType());
        item.setTitle(request.title());
        item.setDescription(request.description());
        item.setExternalUrl(request.externalUrl());
        PortfolioItem saved = portfolioItemRepository.save(item);
        return toResponse(saved, "NONE");
    }

    @Override
    public PortfolioItemResponse updateItem(UUID itemId, PortfolioItemUpdateRequest request, UUID userId) {
        PortfolioItem item = portfolioItemRepository.findByIdAndUserId(itemId, userId)
                .orElseThrow(() -> new PortfolioItemNotFoundException("Portfolio item not found: " + itemId));
        if (request.title() != null) item.setTitle(request.title());
        if (request.description() != null) item.setDescription(request.description());
        if (request.externalUrl() != null) item.setExternalUrl(request.externalUrl());
        if (request.displayOrder() != null) item.setDisplayOrder(request.displayOrder());
        PortfolioItem saved = portfolioItemRepository.save(item);
        String status = deriveVerificationStatus(saved.isVerified(), saved.getVerificationRequests());
        return toResponse(saved, status);
    }

    @Override
    @Transactional
    public void deleteItem(UUID itemId, UUID userId) {
        PortfolioItem item = portfolioItemRepository.findByIdAndUserId(itemId, userId)
                .orElseThrow(() -> new PortfolioItemNotFoundException("Portfolio item not found: " + itemId));
        portfolioItemRepository.delete(item);
    }

    @Override
    public List<PortfolioItemResponse> getMyPortfolio(UUID userId) {
        return portfolioItemRepository.findByUserIdWithVerificationRequests(userId)
                .stream()
                .map(item -> {
                    String status = deriveVerificationStatus(item.isVerified(), item.getVerificationRequests());
                    return toResponse(item, status);
                })
                .toList();
    }

    @Override
    public List<PortfolioItemResponse> getPublicPortfolio(UUID userId) {
        return portfolioItemRepository.findByUserIdAndVerifiedTrue(userId)
                .stream()
                .sorted(Comparator.comparingInt(PortfolioItem::getDisplayOrder)
                        .thenComparing(Comparator.comparing(PortfolioItem::getCreatedAt).reversed()))
                .map(item -> toResponse(item, "APPROVED"))
                .toList();
    }

    @Override
    @Transactional
    public VerificationRequestResponse requestVerification(UUID itemId, UUID requestedBy) {
        PortfolioItem item = portfolioItemRepository.findByIdAndUserId(itemId, requestedBy)
                .orElseThrow(() -> new PortfolioItemNotFoundException("Portfolio item not found: " + itemId));
        if (verificationRequestRepository.existsByPortfolioItemIdAndStatus(itemId, "PENDING")) {
            throw new DuplicateVerificationException(
                    "A verification request is already pending for this item");
        }
        VerificationRequest vr = new VerificationRequest();
        vr.setPortfolioItem(item);
        vr.setRequestedBy(requestedBy);
        vr.setRequestedAt(Instant.now());

        try {
            ClaudeVerificationResponse aiResult = claudeVerificationService.verify(item);
            String decision = aiResult.decision();
            vr.setStatus(decision);
            vr.setReviewerNote(aiResult.reason());
            vr.setReviewSource("AI");
            vr.setReviewedAt(Instant.now());
            if ("APPROVED".equals(decision)) {
                item.setVerified(true);
                portfolioItemRepository.save(item);
            }
        } catch (AiServiceException e) {
            log.warn("AI verification failed for item {}, falling back to PENDING: {}", itemId, e.getMessage());
            vr.setStatus("PENDING");
            vr.setReviewSource("PENDING_FALLBACK");
        }

        VerificationRequest saved = verificationRequestRepository.save(vr);
        return toVerificationResponse(saved);
    }

    @Override
    @Transactional
    public VerificationRequestResponse reviewVerification(UUID requestId, VerificationDecisionRequest decision,
                                                          UUID reviewedBy, String reviewerRole) {
        if (!reviewerRole.equals("ADMIN")) {
            throw new AccessDeniedException("Access denied");
        }
        VerificationRequest vr = verificationRequestRepository.findById(requestId)
                .orElseThrow(() -> new VerificationRequestNotFoundException(
                        "Verification request not found: " + requestId));
        if (!vr.getStatus().equals("PENDING")) {
            throw new VerificationAlreadyResolvedException("Verification request is already resolved");
        }
        vr.setStatus(decision.decision());
        vr.setReviewedBy(reviewedBy);
        vr.setReviewerNote(decision.reviewerNote());
        vr.setReviewedAt(Instant.now());
        vr.setReviewSource("HUMAN");
        if ("APPROVED".equals(decision.decision())) {
            vr.getPortfolioItem().setVerified(true);
            portfolioItemRepository.save(vr.getPortfolioItem());
        }
        return toVerificationResponse(verificationRequestRepository.save(vr));
    }

    @Override
    public ShareLinkResponse generateShareLink(UUID userId, String baseUrl) {
        return portfolioLinkRepository.findByUserId(userId)
                .map(link -> toShareResponse(link, baseUrl))
                .orElseGet(() -> {
                    PortfolioLink link = new PortfolioLink();
                    link.setUserId(userId);
                    link.setShareToken(shareTokenGenerator.generateToken());
                    return toShareResponse(portfolioLinkRepository.save(link), baseUrl);
                });
    }

    @Override
    public List<PortfolioItemResponse> getSharePortfolio(String token) {
        PortfolioLink link = portfolioLinkRepository.findByShareTokenAndActiveTrue(token)
                .orElseThrow(() -> new PortfolioItemNotFoundException("Share link not found"));
        return getPublicPortfolio(link.getUserId());
    }

    private String deriveVerificationStatus(boolean verified, Set<VerificationRequest> requests) {
        if (verified) return "APPROVED";
        if (requests == null || requests.isEmpty()) return "NONE";
        boolean hasPending = requests.stream().anyMatch(r -> "PENDING".equals(r.getStatus()));
        if (hasPending) return "PENDING";
        boolean hasRejected = requests.stream().anyMatch(r -> "REJECTED".equals(r.getStatus()));
        if (hasRejected) return "REJECTED";
        return "NONE";
    }

    private PortfolioItemResponse toResponse(PortfolioItem item, String verificationStatus) {
        return new PortfolioItemResponse(
                item.getId(), item.getUserId(), item.getItemType(), item.getTitle(),
                item.getDescription(), item.getExternalUrl(), item.isVerified(),
                verificationStatus, item.getDisplayOrder(), item.getCreatedAt()
        );
    }

    private VerificationRequestResponse toVerificationResponse(VerificationRequest vr) {
        return new VerificationRequestResponse(
                vr.getId(), vr.getPortfolioItem().getId(), vr.getStatus(),
                vr.getReviewerNote(), vr.getReviewSource(),
                vr.getRequestedAt(), vr.getReviewedAt()
        );
    }

    private ShareLinkResponse toShareResponse(PortfolioLink link, String baseUrl) {
        return new ShareLinkResponse(
                link.getShareToken(),
                baseUrl + "/portfolio/share/" + link.getShareToken(),
                link.isActive(),
                link.getCreatedAt()
        );
    }
}
