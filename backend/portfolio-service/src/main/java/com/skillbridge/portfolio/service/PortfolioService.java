package com.skillbridge.portfolio.service;

import com.skillbridge.portfolio.dto.request.PortfolioItemRequest;
import com.skillbridge.portfolio.dto.request.PortfolioItemUpdateRequest;
import com.skillbridge.portfolio.dto.request.VerificationDecisionRequest;
import com.skillbridge.portfolio.dto.response.PortfolioItemResponse;
import com.skillbridge.portfolio.dto.response.ShareLinkResponse;
import com.skillbridge.portfolio.dto.response.VerificationRequestResponse;

import java.util.List;
import java.util.UUID;

public interface PortfolioService {

    PortfolioItemResponse createItem(PortfolioItemRequest request, UUID userId);

    PortfolioItemResponse updateItem(UUID itemId, PortfolioItemUpdateRequest request, UUID userId);

    void deleteItem(UUID itemId, UUID userId);

    List<PortfolioItemResponse> getMyPortfolio(UUID userId);

    List<PortfolioItemResponse> getPublicPortfolio(UUID userId);

    VerificationRequestResponse requestVerification(UUID itemId, UUID requestedBy);

    VerificationRequestResponse reviewVerification(UUID requestId, VerificationDecisionRequest decision, UUID reviewedBy, String reviewerRole);

    ShareLinkResponse generateShareLink(UUID userId, String baseUrl);

    List<PortfolioItemResponse> getSharePortfolio(String token);
}
