import Foundation
import Capacitor
import HealthKit

@objc(WorkoutRoutePlugin)
public class WorkoutRoutePlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "WorkoutRoutePlugin"
    public let jsName = "WorkoutRoute"

    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getRoutes", returnType: CAPPluginReturnPromise),
    ]

    private let healthStore = HKHealthStore()

    /// startDate ~ endDate 사이의 러닝 워크아웃 GPS 경로를 모두 가져옵니다.
    /// JS 호출: WorkoutRoute.getRoutes({ startDate, endDate, limit })
    @objc func getRoutes(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit not available")
            return
        }

        let startDateStr = call.getString("startDate") ?? ""
        let endDateStr = call.getString("endDate") ?? ""
        let limit = call.getInt("limit") ?? 500

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        guard let startDate = formatter.date(from: startDateStr) ?? ISO8601DateFormatter().date(from: startDateStr) else {
            call.reject("Invalid startDate")
            return
        }
        guard let endDate = formatter.date(from: endDateStr) ?? ISO8601DateFormatter().date(from: endDateStr) else {
            call.reject("Invalid endDate")
            return
        }

        // HealthKit 권한 요청 (workout route 읽기)
        let workoutType = HKObjectType.workoutType()
        let routeType = HKSeriesType.workoutRoute()

        healthStore.requestAuthorization(toShare: nil, read: [workoutType, routeType]) { [weak self] success, error in
            guard let self = self, success else {
                call.reject("HealthKit authorization failed: \(error?.localizedDescription ?? "unknown")")
                return
            }
            self.queryRunningWorkouts(startDate: startDate, endDate: endDate, limit: limit, call: call)
        }
    }

    private func queryRunningWorkouts(startDate: Date, endDate: Date, limit: Int, call: CAPPluginCall) {
        let predicate = HKQuery.predicateForWorkouts(with: .running)
        let datePredicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let compound = NSCompoundPredicate(andPredicateWithSubpredicates: [predicate, datePredicate])

        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

        let query = HKSampleQuery(
            sampleType: HKObjectType.workoutType(),
            predicate: compound,
            limit: limit,
            sortDescriptors: [sortDescriptor]
        ) { [weak self] _, samples, error in
            guard let self = self else { return }

            if let error = error {
                call.reject("Workout query failed: \(error.localizedDescription)")
                return
            }

            guard let workouts = samples as? [HKWorkout], !workouts.isEmpty else {
                call.resolve(["routes": []])
                return
            }

            // 각 워크아웃에서 경로 추출
            let group = DispatchGroup()
            var results: [[String: Any]] = []
            let lock = NSLock()

            for workout in workouts {
                group.enter()
                self.fetchRoute(for: workout) { routeData in
                    if let routeData = routeData {
                        lock.lock()
                        results.append(routeData)
                        lock.unlock()
                    }
                    group.leave()
                }
            }

            group.notify(queue: .main) {
                call.resolve(["routes": results])
            }
        }

        healthStore.execute(query)
    }

    private func fetchRoute(for workout: HKWorkout, completion: @escaping ([String: Any]?) -> Void) {
        let routeType = HKSeriesType.workoutRoute()
        let predicate = HKQuery.predicateForObjects(from: workout)

        let routeQuery = HKSampleQuery(
            sampleType: routeType,
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: nil
        ) { [weak self] _, samples, error in
            guard let self = self,
                  let routes = samples as? [HKWorkoutRoute],
                  let route = routes.first else {
                completion(nil)
                return
            }

            // Route에서 CLLocation 배열 추출
            var allLocations: [[Double]] = []

            let routeDataQuery = HKWorkoutRouteQuery(route: route) { _, locations, done, error in
                if let locations = locations {
                    for location in locations {
                        // GeoJSON 형식: [lng, lat, elevation]
                        allLocations.append([
                            location.coordinate.longitude,
                            location.coordinate.latitude,
                            location.altitude
                        ])
                    }
                }

                if done {
                    if allLocations.isEmpty {
                        completion(nil)
                        return
                    }

                    let formatter = ISO8601DateFormatter()
                    let result: [String: Any] = [
                        "startDate": formatter.string(from: workout.startDate),
                        "endDate": formatter.string(from: workout.endDate),
                        "distance": workout.totalDistance?.doubleValue(for: .meter()) ?? 0,
                        "duration": workout.duration,
                        "coordinates": allLocations,
                    ]
                    completion(result)
                }
            }

            self.healthStore.execute(routeDataQuery)
        }

        healthStore.execute(routeQuery)
    }
}
