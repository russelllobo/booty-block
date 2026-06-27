import ExpoModulesCore
import Combine
import SwiftUI
import UIKit

public class RollingNumberModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RollingNumber")

    View(RollingNumberView.self) {
      Prop("value") { (view: RollingNumberView, value: String) in
        view.setValue(value)
      }

      Prop("color") { (view: RollingNumberView, color: String) in
        view.model.color = Color(hex: color)
      }

      Prop("fontSize") { (view: RollingNumberView, fontSize: Double) in
        view.model.fontSize = fontSize
      }

      Prop("fontWeight") { (view: RollingNumberView, fontWeight: String) in
        view.model.fontWeight = Font.Weight.from(fontWeight)
      }

      Prop("letterSpacing") { (view: RollingNumberView, letterSpacing: Double) in
        view.model.letterSpacing = letterSpacing
      }

      Prop("countsDown") { (view: RollingNumberView, countsDown: Bool) in
        view.model.countsDown = countsDown
      }
    }
  }
}

final class RollingNumberView: ExpoView {
  let model: RollingNumberModel
  private let hostingController: UIHostingController<RollingNumberContent>

  required init(appContext: AppContext? = nil) {
    let model = RollingNumberModel()
    self.model = model
    hostingController = UIHostingController(rootView: RollingNumberContent(model: model))
    super.init(appContext: appContext)

    backgroundColor = .clear
    hostingController.view.backgroundColor = .clear
    hostingController.view.translatesAutoresizingMaskIntoConstraints = false
    addSubview(hostingController.view)

    NSLayoutConstraint.activate([
      hostingController.view.leadingAnchor.constraint(equalTo: leadingAnchor),
      hostingController.view.trailingAnchor.constraint(equalTo: trailingAnchor),
      hostingController.view.topAnchor.constraint(equalTo: topAnchor),
      hostingController.view.bottomAnchor.constraint(equalTo: bottomAnchor)
    ])
  }

  func setValue(_ value: String) {
    guard model.value != value else {
      return
    }

    withAnimation(.easeOut(duration: 0.22)) {
      model.value = value
    }
  }
}

final class RollingNumberModel: ObservableObject {
  @Published var value = "0"
  @Published var color = Color(hex: "#4A2B22")
  @Published var fontSize = 124.0
  @Published var fontWeight = Font.Weight.black
  @Published var letterSpacing = 0.0
  @Published var countsDown = false
}

struct RollingNumberContent: View {
  @ObservedObject var model: RollingNumberModel

  var body: some View {
    Text(model.value)
      .font(.system(size: model.fontSize, weight: model.fontWeight, design: .rounded))
      .foregroundStyle(model.color)
      .monospacedDigit()
      .kerning(model.letterSpacing)
      .lineLimit(1)
      .minimumScaleFactor(0.4)
      .contentTransition(.numericText(countsDown: model.countsDown))
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
  }
}

extension Font.Weight {
  static func from(_ value: String) -> Font.Weight {
    switch value {
    case "900", "black":
      return .black
    case "800", "heavy":
      return .heavy
    case "700", "bold":
      return .bold
    case "600", "semibold":
      return .semibold
    default:
      return .black
    }
  }
}

extension Color {
  init(hex: String) {
    let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    var value: UInt64 = 0
    Scanner(string: cleaned).scanHexInt64(&value)

    let red: UInt64
    let green: UInt64
    let blue: UInt64
    let alpha: UInt64

    switch cleaned.count {
    case 3:
      red = (value >> 8) * 17
      green = ((value >> 4) & 0xF) * 17
      blue = (value & 0xF) * 17
      alpha = 255
    case 6:
      red = value >> 16
      green = (value >> 8) & 0xFF
      blue = value & 0xFF
      alpha = 255
    case 8:
      red = value >> 24
      green = (value >> 16) & 0xFF
      blue = (value >> 8) & 0xFF
      alpha = value & 0xFF
    default:
      red = 74
      green = 43
      blue = 34
      alpha = 255
    }

    self.init(
      .sRGB,
      red: Double(red) / 255,
      green: Double(green) / 255,
      blue: Double(blue) / 255,
      opacity: Double(alpha) / 255
    )
  }
}
