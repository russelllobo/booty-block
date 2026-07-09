import ExpoModulesCore
import Foundation
import TikTokBusinessSDK

public class BootyblockTikTokModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BootyblockTikTok")

    Constants([
      "isAvailable": true
    ])

    AsyncFunction("trackEventAsync") { (eventName: String, properties: [String: Any]?) in
      guard TikTokBusiness.isInitialized() else {
        return
      }

      let event = TikTokBaseEvent(eventName: eventName)
      for (key, value) in sanitizedProperties(properties ?? [:]) {
        event.addProperty(withKey: key, value: value)
      }
      TikTokBusiness.trackTTEvent(event)
    }

    AsyncFunction("trackPurchaseAsync") { (properties: [String: Any]?) in
      guard TikTokBusiness.isInitialized() else {
        return
      }

      let event = TikTokPurchaseEvent(eventId: eventId(from: properties))
      applyCommerceProperties(to: event, properties: properties ?? [:])
      TikTokBusiness.trackTTEvent(event)
    }

    AsyncFunction("requestTrackingAuthorizationAsync") { () -> Int in
      await withCheckedContinuation { continuation in
        TikTokBusiness.requestTrackingAuthorization { status in
          continuation.resume(returning: Int(status))
        }
      }
    }
  }
}

private func sanitizedProperties(_ properties: [String: Any]) -> [String: Any] {
  properties.compactMapValues { value in
    switch value {
    case let string as String:
      return string
    case let number as NSNumber:
      return number
    case let bool as Bool:
      return bool
    case let int as Int:
      return int
    case let double as Double:
      return double
    default:
      return nil
    }
  }
}

private func eventId(from properties: [String: Any]?) -> String {
  guard let eventId = properties?["event_id"] as? String, !eventId.isEmpty else {
    return UUID().uuidString
  }

  return eventId
}

private func applyCommerceProperties(to event: TikTokContentsEvent, properties: [String: Any]) {
  event.setCurrency(TTCurrency.USD)
  event.setContentType((properties["content_type"] as? String) ?? "subscription")
  event.setContentId((properties["content_id"] as? String) ?? "bootyblock_pro")
  event.setDescription((properties["description"] as? String) ?? "Bootyblock Pro subscription")

  let value = decimalString(from: properties["value"]) ?? "0"
  event.setValue(value)

  let content = TikTokContentParams()
  content.price = NSNumber(value: Double(value) ?? 0)
  content.quantity = 1
  content.brand = "Bootyblock"
  content.contentId = (properties["content_id"] as? String) ?? "bootyblock_pro"
  content.contentName = (properties["content_name"] as? String) ?? "Bootyblock Pro"
  event.setContents([content])
}

private func decimalString(from value: Any?) -> String? {
  switch value {
  case let string as String:
    return string
  case let number as NSNumber:
    return String(format: "%.2f", number.doubleValue)
  case let int as Int:
    return String(format: "%.2f", Double(int))
  case let double as Double:
    return String(format: "%.2f", double)
  default:
    return nil
  }
}
